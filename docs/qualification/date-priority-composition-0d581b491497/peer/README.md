# Independent ReturnBy explicit-order-date receiving

The 28-case oracle was frozen after reading only the unchanged public parser and agreed existing contract, before receiving the candidate or reading any donor tests. Expectations cover the complete parsed order record, all found flags and every recognized date's original UTF-16 position.

The original month-plus-order-label source af2e4f5 passes 13/28. Its 15 failures all choose an earlier nearby delivery date instead of the valid directly labeled order date. The composed source passes 28/28; all original and candidate date-hit arrays match exactly. Both actual Node invocations finish normally; the original receiver exits 1 for the observed mismatches and the candidate receiver exits 0.

## Replay

Requires Python standard library and a Node build with TypeScript type-stripping support (qualified here: Node v24.19.0). Choose a new absent output directory:

```sh
python3 -B receive.py --source /absolute/ReturnBy/src/parse.ts --expected-sha256 6fdc382d9d3172d71cf66fd86e1597ff38c28c31b6977bbad5e0c096d9ecb55a --oracle ./oracle.json --out /absolute/new-candidate-course
```

For the original arm, use its exact source path and SHA256 b603f60a64fe77a50c527f18f852838248cbe9747d6f241ae19379a238f85fc1. The receiver copies exact source bytes to a .mts file in its output directory; it neither transpiles nor edits the product. `--node` selects an explicit existing Node executable. A runtime without TypeScript stripping is an unmet dependency, not a parser result.

`ORACLE-FREEZE.json`, `oracle.json` and `receive.py` preserve the method. Each course preserves exact loaded source, driver, stdout, stderr and detailed receipt. `review.json` and `source.diff` record the bounded production review. No mail, network, browser, native application, deployment or live order data was used.
