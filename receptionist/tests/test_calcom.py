"""Cal.com client tests against hand-written fixtures; no network, no key.

Requests go to a local aiohttp test server that records what it receives and
answers with the fixtures in ``tests/fixtures``.
"""

from __future__ import annotations

import asyncio
import datetime as dt
from dataclasses import dataclass, field

import pytest
from aiohttp import web
from aiohttp.test_utils import TestServer
from fakes import CALLER_PHONE, PACIFIC, load_fixture

from calcom import (
    BOOKINGS_API_VERSION,
    SLOTS_API_VERSION,
    USER_AGENT,
    BookingLimitError,
    BookingOutcomeUnknownError,
    BookingRequest,
    BookingWindowError,
    CalComClient,
    CalComError,
    CalendarUnavailableError,
    SlotUnavailableError,
    build_booking_payload,
    classify_error,
    parse_slots,
)

TEST_KEY = "cal_test_not_a_real_key"
EVENT_TYPE_ID = 1000001


@dataclass
class Recorded:
    method: str
    path: str
    headers: dict
    query: dict
    json: object


@dataclass
class FakeCalApi:
    """Canned responses per route, plus every request it received."""

    responses: dict[str, web.Response] = field(default_factory=dict)
    requests: list[Recorded] = field(default_factory=list)

    def reply(self, route: str, *, status: int = 200, payload=None, text=None):
        if payload is not None:
            self.responses[route] = web.json_response(payload, status=status)
        else:
            self.responses[route] = web.Response(
                status=status, text=text or "", content_type="text/html"
            )

    async def handle(self, request: web.Request) -> web.StreamResponse:
        body = await request.json() if request.can_read_body else None
        self.requests.append(
            Recorded(
                method=request.method,
                path=request.path,
                headers=dict(request.headers),
                query=dict(request.query),
                json=body,
            )
        )
        return self.responses[f"{request.method} {request.path}"]

    def only_request(self) -> Recorded:
        assert len(self.requests) == 1
        return self.requests[0]


@pytest.fixture
async def api():
    fake = FakeCalApi()
    app = web.Application()
    app.router.add_route("*", "/v2/{tail:.*}", fake.handle)
    server = TestServer(app)
    await server.start_server()
    fake.base_url = str(server.make_url("/v2/"))
    yield fake
    await server.close()


@pytest.fixture
async def client(api):
    c = CalComClient(
        api_key=TEST_KEY, event_type_id=EVENT_TYPE_ID, base_url=api.base_url
    )
    yield c
    await c.aclose()


def assert_headers(headers: dict, api_version: str) -> None:
    assert headers["Authorization"] == f"Bearer {TEST_KEY}"
    assert headers["cal-api-version"] == api_version
    assert headers["User-Agent"] == USER_AGENT


def booking_request(**overrides) -> BookingRequest:
    values = {
        "start": dt.datetime(2033, 9, 5, 9, 0, tzinfo=PACIFIC),
        "duration_minutes": 30,
        "name": "Alex Example",
        "phone_number": CALLER_PHONE,
        "time_zone": "America/Los_Angeles",
    }
    values.update(overrides)
    return BookingRequest(**values)


# --- slots ------------------------------------------------------------------


async def test_get_slots_parses_fixture_and_sends_query(api, client):
    start = dt.datetime(2033, 9, 5, 0, 0, tzinfo=dt.UTC)
    end = start + dt.timedelta(days=3)
    api.reply("GET /v2/slots", payload=load_fixture("slots_2024_09_04.json"))
    slots = await client.get_slots(start=start, end=end, duration_minutes=15)
    call = api.only_request()

    assert len(slots) == 8
    assert slots == sorted(slots)
    assert all(s.tzinfo is not None for s in slots)
    assert slots[0] == dt.datetime(2033, 9, 5, 16, 0, tzinfo=dt.UTC)

    assert call.method == "GET"
    assert_headers(call.headers, SLOTS_API_VERSION)
    params = call.query
    assert params["eventTypeId"] == str(EVENT_TYPE_ID)
    assert params["duration"] == "15"
    assert params["start"] == "2033-09-05T00:00:00Z"
    assert params["end"] == "2033-09-08T00:00:00Z"


async def test_get_slots_empty(api, client):
    api.reply("GET /v2/slots", payload=load_fixture("slots_empty.json"))
    slots = await client.get_slots(
        start=dt.datetime(2033, 9, 5, tzinfo=dt.UTC),
        end=dt.datetime(2033, 9, 6, tzinfo=dt.UTC),
        duration_minutes=30,
    )
    assert slots == []


def test_parse_slots_tolerates_bare_strings_and_duplicates():
    body = {
        "status": "success",
        "data": {
            "2033-09-05": [
                "2033-09-05T16:00:00.000Z",
                {"start": "2033-09-05T09:00:00.000-07:00"},
                {"start": "not a time"},
            ]
        },
    }
    assert parse_slots(body) == [dt.datetime(2033, 9, 5, 16, 0, tzinfo=dt.UTC)]


def test_parse_slots_rejects_unexpected_shape():
    with pytest.raises(CalComError):
        parse_slots({"status": "success", "data": []})


# --- bookings ---------------------------------------------------------------


def test_payload_is_phone_only_without_email_or_notes():
    payload = build_booking_payload(booking_request(), event_type_id=EVENT_TYPE_ID)
    assert payload == {
        "start": "2033-09-05T16:00:00Z",
        "eventTypeId": EVENT_TYPE_ID,
        "lengthInMinutes": 30,
        "attendee": {
            "name": "Alex Example",
            "timeZone": "America/Los_Angeles",
            "phoneNumber": CALLER_PHONE,
        },
        "location": {"type": "attendeePhone", "phone": CALLER_PHONE},
    }


def test_payload_includes_email_and_notes_only_when_given():
    payload = build_booking_payload(
        booking_request(
            duration_minutes=15,
            email="alex@example.com",
            notes="LiveKit role",
            time_zone="America/New_York",
        ),
        event_type_id=EVENT_TYPE_ID,
    )
    assert payload["lengthInMinutes"] == 15
    assert payload["attendee"]["email"] == "alex@example.com"
    assert payload["attendee"]["timeZone"] == "America/New_York"
    assert payload["bookingFieldsResponses"] == {"notes": "LiveKit role"}


def test_payload_rejects_naive_start():
    with pytest.raises(ValueError):
        build_booking_payload(
            booking_request(start=dt.datetime(2033, 9, 5, 9)),
            event_type_id=EVENT_TYPE_ID,
        )


async def test_create_booking_posts_payload_and_returns_uid(api, client):
    api.reply(
        "POST /v2/bookings",
        status=201,
        payload=load_fixture("booking_created_2024_08_13.json"),
    )
    result = await client.create_booking(booking_request())
    call = api.only_request()

    assert result.uid == "booking-uid-fixture-0001"
    assert result.start == dt.datetime(2033, 9, 5, 16, 0, tzinfo=dt.UTC)
    assert call.method == "POST"
    assert_headers(call.headers, BOOKINGS_API_VERSION)
    assert call.json == build_booking_payload(
        booking_request(), event_type_id=EVENT_TYPE_ID
    )
    assert "email" not in call.json["attendee"]


async def test_create_booking_without_uid_is_an_unconfirmed_outcome(api, client):
    # A success with no uid may still have created the booking.
    api.reply(
        "POST /v2/bookings", status=201, payload={"status": "success", "data": {}}
    )
    with pytest.raises(BookingOutcomeUnknownError):
        await client.create_booking(booking_request())


@pytest.mark.parametrize("status", [500, 502, 503])
async def test_server_error_on_a_booking_is_an_unconfirmed_outcome(api, client, status):
    api.reply("POST /v2/bookings", status=status, text="upstream error")
    with pytest.raises(BookingOutcomeUnknownError) as caught:
        await client.create_booking(booking_request())
    assert caught.value.status == status


async def test_server_error_on_a_read_stays_unavailable(api, client):
    api.reply("GET /v2/slots", status=503, text="upstream error")
    with pytest.raises(CalendarUnavailableError):
        await client.get_slots(
            start=dt.datetime(2033, 9, 5, tzinfo=dt.UTC),
            end=dt.datetime(2033, 9, 6, tzinfo=dt.UTC),
            duration_minutes=30,
        )


async def test_booking_timeout_is_an_unconfirmed_outcome():
    # The request reaches the server, which answers too late: Cal.com may
    # have created the booking, so the outcome is unknown, not a failure.
    async def slow(_request: web.Request) -> web.Response:
        await asyncio.sleep(2)
        return web.json_response({"status": "success", "data": {"uid": "late"}})

    app = web.Application()
    app.router.add_route("POST", "/v2/bookings", slow)
    server = TestServer(app)
    await server.start_server()
    slow_client = CalComClient(
        api_key=TEST_KEY,
        event_type_id=EVENT_TYPE_ID,
        base_url=str(server.make_url("/v2/")),
        timeout_seconds=0.2,
    )
    try:
        with pytest.raises(BookingOutcomeUnknownError):
            await slow_client.create_booking(booking_request())
    finally:
        await slow_client.aclose()
        await server.close()


async def test_refused_connection_on_a_booking_is_a_plain_failure():
    # Nothing was sent, so nothing can have been booked.
    unreachable = CalComClient(
        api_key=TEST_KEY,
        event_type_id=EVENT_TYPE_ID,
        base_url="http://127.0.0.1:9/v2/",
        timeout_seconds=2,
    )
    try:
        with pytest.raises(CalendarUnavailableError):
            await unreachable.create_booking(booking_request())
    finally:
        await unreachable.aclose()


# --- errors -----------------------------------------------------------------


@pytest.mark.parametrize(
    ("fixture", "status", "expected"),
    [
        ("error_slot_taken.json", 400, SlotUnavailableError),
        ("error_booking_limit.json", 400, BookingLimitError),
        ("error_out_of_bounds.json", 400, BookingWindowError),
        ("error_unauthorized.json", 401, CalendarUnavailableError),
    ],
)
async def test_booking_errors_map_to_typed_errors(
    api, client, fixture, status, expected
):
    api.reply("POST /v2/bookings", status=status, payload=load_fixture(fixture))
    with pytest.raises(expected) as caught:
        await client.create_booking(booking_request())
    assert caught.value.status == status
    assert caught.value.spoken  # every error carries a sentence for the caller


async def test_non_json_error_body_is_tolerated(api, client):
    api.reply("POST /v2/bookings", status=403, text="<html>Forbidden</html>")
    with pytest.raises(CalendarUnavailableError):
        await client.create_booking(booking_request())


async def test_network_failure_maps_to_unavailable():
    # Nothing listens on port 9 (discard) locally, so the connection fails.
    unreachable = CalComClient(
        api_key=TEST_KEY,
        event_type_id=EVENT_TYPE_ID,
        base_url="http://127.0.0.1:9/v2/",
        timeout_seconds=2,
    )
    try:
        with pytest.raises(CalendarUnavailableError):
            await unreachable.get_slots(
                start=dt.datetime(2033, 9, 5, tzinfo=dt.UTC),
                end=dt.datetime(2033, 9, 6, tzinfo=dt.UTC),
                duration_minutes=30,
            )
    finally:
        await unreachable.aclose()


def test_error_status_in_200_body_is_classified():
    assert isinstance(
        classify_error(200, load_fixture("error_slot_taken.json")),
        SlotUnavailableError,
    )


@pytest.mark.parametrize("status", [429, 500, 503])
def test_server_side_errors_are_unavailable(status):
    assert isinstance(classify_error(status, None), CalendarUnavailableError)


def test_unknown_error_is_generic_and_speakable():
    error = classify_error(400, {"status": "error", "error": {"message": "nope"}})
    assert type(error) is CalComError
    assert "website" in error.spoken
