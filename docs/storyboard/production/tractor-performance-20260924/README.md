# Tractor performance and continuous controls

This pack records successive performance and control changes. Read the latest
control mapping alongside the server report and first performance benchmark;
their tests cover different runtime revisions.

- [REPORT.md](REPORT.md): first performance pass, committed as `f32f683`.
  Renderer reuse, bounded texture caching, exact-frame and visual comparisons.
  Baseline/final screenshots and traces are preserved by
  `assets/tractor-performance-20260924.json` and its verified receipt.
- [INVERTED-CONTROLS.md](INVERTED-CONTROLS.md): current mapping: one finger
  looks around; two fingers orbit the tractor.
- [CONTROL-FLOW.md](CONTROL-FLOW.md): earlier continuous, no-click input
  behavior, transition handoffs, and removal of unnecessary transition work.
  Its original finger mapping is superseded by INVERTED-CONTROLS.md.
- [SERVER-CACHE.md](SERVER-CACHE.md): subsequent local preview-server cache
  validation, unchanged-media reuse, and video range-request checks.

The first-pass benchmark numbers describe its recorded build and mini hardware.
They are not measurements of every later control revision or every device.
All artwork and original media remain unchanged. These are local review-demo
changes; this pack does not record an official website deployment.
