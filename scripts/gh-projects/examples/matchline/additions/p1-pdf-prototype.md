Prototype PDF rendering on Nathan's real resume at the **end of Phase 1**, not deep Phase 2. De-risks a medium-likelihood, medium-impact risk (PDF fidelity below "would I send this" bar) before Phase 2 commits to the full PDF/DOCX/plain-text export surface in #33.

**Why this is pulled forward.**

`react-pdf` has opinions about layout that fight a tight-density resume. The "would Nathan actually send this?" bar is binary and personal — it's not a spec compliance question, it's a does-this-look-like-a-real-resume question. If the layout model has fundamental issues, Phase 2's #33 either slips or ships a resume Nathan won't send. Finding this in Phase 1 week 3 (after the full generation flow produces real output) means Phase 2 opens with the risk known, not discovered.

**Scope:**

1. **Spike PR, not production code.** One-off branch that renders the output of #22 (resume generation) through `react-pdf`. Open it as a draft PR against main for review only; it must never merge into main with the `/debug/pdf-prototype` route. Gate the route with the same authenticated-owner check as every other protected route (not just hidden from the main nav — a hidden route is still reachable if deployed).
2. **Real inputs only.** Render the JSON output of a real Phase 1 end-to-end run on Nathan's resume against one real target JD. No lorem ipsum.
3. **Evaluate the layout model.** Does `react-pdf` hold a 1-page dense resume with tight leading? Can it handle 6-point contact info + 10-point body + 11-point headings without font-weight quirks? How does it fare on long bullet wrapping + section widow/orphan control? Document answers in the PR description.
4. **Binary fidelity call.** Nathan opens the PDF and answers: "would I actually send this?" Yes → #33 proceeds with `react-pdf` in Phase 2. No → file a Phase 2 pre-work ticket to evaluate alternatives (Puppeteer + HTML/CSS, `pdf-lib`, a template-based service like React-PDF-Template) before #33 starts.
5. **Promote or close, don't merge the spike to main.** If the answer is yes, create #33's implementation branch from main, then either retarget the draft spike PR to that branch or cherry-pick its reviewed commits into #33's branch. Close the original spike PR after the commits are present on #33's branch. If no, close the prototype PR with the findings captured in the Phase 2 pre-work ticket. Either way, the debug route never lands on main and nothing is left open past the fidelity call.

**Non-goals:**

- DOCX export (stays in #33, Phase 2).
- Plain-text export (stays in #33, Phase 2).
- Multi-format export pipeline (stays in #33).
- Polish / design work. This is a fidelity check, not a layout pass.

**Verification:**

- Draft spike PR closed with a documented fidelity call; it is never merged into main.
- If yes: the reviewed spike commits are present on #33's implementation branch and `react-pdf` is marked as the chosen library in #33's scope.
- If no: Phase 2 pre-work ticket filed with alternative options + rough evaluation criteria.
- Nathan has physically opened the rendered PDF and given a thumbs-up or -down in the PR description.

Parent: #__PARENT_NUM__
Related: #33 (Phase 2 — full PDF/DOCX/plain-text export); #22 (Phase 1 — resume generation; produces the input).
