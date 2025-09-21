export function parseClaudeJson(raw: string) {
    try {
        // Remove markdown fences if present
        let txt = raw.trim()
        if (txt.startsWith("```")) {
            // strip ```json ... ```
            txt = txt.replace(/^```[a-zA-Z]*\n/, "").replace(/```$/, "").trim()
        }

        const data = JSON.parse(txt)

        // Make sure we have rows + issues keys
        return {
            rows: Array.isArray(data.rows) ? data.rows : [],
            issues: Array.isArray(data.issues) ? data.issues : []
        }
    } catch (e) {
        console.error("Failed to parse Claude JSON:", e)
        return { rows: [], issues: [], error: "parse_failed" }
    }
}