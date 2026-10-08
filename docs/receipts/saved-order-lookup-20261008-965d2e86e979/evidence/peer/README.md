# ReturnBy lookup: independent source receiving

Disposition: **ACCEPTED_SOURCE_ONLY** for application `1fbd1fc26f98f788826333494c5330e0c2f939d7`, tree `abce32e4624ae5a24ef976a84a88955f3899b833`.

The baseline is the exact receiving tree of [ReturnBy PR #20](https://github.com/Jacob-Met/returnby/pull/20), represented locally by `f6f030a040e14ba16cf6dc683921ba0d8e80369e`. The remote PR head and local surrogate share tree `b28e7b706fe67fd4b34111badd581c6bdd2ed4a7`. PR #20 was open when read; actual main was `3913697f70a31d73e8fe7d02b686b306830c24db`. Any later composition with main is a distinct gate.

The reviewer received all 196 candidate leaves and proved preservation of 188 original leaves. Only README, the search HTML and the narrow main bindings/render span change existing files. The included inverse proof checks unchanged action code, deadline sort, global counters, date-filter state, card identities, and all text outside the declared additions. The source review found no required repair in matching, optional order numbers, hidden-row editing/removal, global counts, export scope or failure states.

This packet contains source review and custody, **zero newly executed product or browser tests**. Producer-authored test and browser outcomes must be attached separately. The browser harness-only successor `2657b9c7570891604dbfe2ff24cc6878cffcf6d7` preserves all accepted application bytes; this packet does not accept its browser execution or a future current-main composition.

The exact read-only proof commands are saved as non-discoverable `.source` files. They refer to the producer's frozen Git objects; no producer files were modified by the reviewer. A manifest-output truncation was corrected by increasing the read budget, without a product/source change.
