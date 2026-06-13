# Teacher data boundary

PR A1 does not copy teacher OCR review data, `evidence/`, `ocr-output/`, review pages,
or template-editor assets into runtime.

Their references and source availability are recorded in
`../reports/disposition-manifest.json`. PR A4 must resolve each dependency before adding
teacher pages. In particular, `svg-p1` and `svg_p2` are distinct source directory names
and must not be normalized into one name.
