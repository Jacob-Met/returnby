# First browser attempt: fixture precondition failure

Product source was unchanged. The first two actual native download groups passed. The third group did not reach CSV export: the existing backup `planImport` validates current saved records strictly and refuses the deliberately seeded `originalEmail` extra property used by the projection challenge. The receiving driver incorrectly expected this current store to produce an admitted backup preview.

The corrected driver uses a separate fresh context containing only the native approved saved fields for the admitted-preview challenge. It retains the original extra-property CSV projection challenge and the original failure evidence. This is a receiving fixture correction, not a product correction or an importer defect claim.
