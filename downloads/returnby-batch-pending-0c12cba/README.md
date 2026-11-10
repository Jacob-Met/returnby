# ReturnBy batch pending delivery release

Source: 0c12cba07c5ac482ddd138c23597cd71008e5aef (PR143).
Download ReturnBy-v0.4.0-browser.zip, extract it, and follow its included launch instructions.

Batch purchases awaiting delivery can now be kept in the shared pending collection and resumed individually from the tracker. No deadline or reminder is created before delivery confirmation. Reviewed fields are retained; raw receipt text is excluded. This cumulative build includes the existing pending backup and recovery work.

Validation: 602 tests and production build passed on fleet workers; native browser test covers pending handoff and storage failure. Independent actual Chrome use by astra-nami passed two-purchase pending, reload, individual resume and separate order/delivery date behavior at desktop and phone sizes.

Known limits: explicit 21/14-day natural policy clauses can still propose a 30-day default, requiring careful review and correction. Recognition badges currently overstate confidence in that case. On phones, saved tracker results can be far below intake controls. These remain product gaps, not accepted functionality.

SHA-256: 6dd567bc65d9b7bdb3e18b41004400e9d82c1353f4f5d35dd29a81fd0c61210a
