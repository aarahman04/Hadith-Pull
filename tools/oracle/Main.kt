import android.database.sqlite.SQLiteDatabase
import online.hadithpull.app.data.search.SearchEngine
import online.hadithpull.app.data.search.AdvancedQuery
import online.hadithpull.app.domain.eligibility.WidgetQuotes
import online.hadithpull.app.domain.eligibility.NarrationClassifier
import java.io.File
import java.time.LocalDate
import java.time.chrono.HijrahDate
import java.time.temporal.ChronoField
import java.util.Base64
import kotlin.random.Random

fun text(s: String) = Base64.getDecoder().decode(s).toString(Charsets.UTF_8)
fun json(s: String) = "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + "\""
fun list(values: Collection<String>) = values.joinToString(",", "[", "]") { json(it) }
fun main(args: Array<String>) {
    val dir = File(args[0])
    val engine = SearchEngine(SQLiteDatabase(args[1]))
    val labels = File(dir, "labels.tsv").readLines().associate { val p = it.split('\t'); p[0] to p[1].split(',').filter { it.isNotBlank() } }
    val subs = File(dir, "subs.tsv").readLines().associate { val p = it.split('\t'); p[0] to p[1].split(',') }
    val names = File(dir, "names.tsv").readLines().associate { val p = it.split('\t'); p[0] to text(p[1]) }
    engine.useLabels(labels, subs)
    File(dir, "results.jsonl").bufferedWriter().use { out ->
        File(dir, "queries.tsv").readLines().forEach { line ->
            val p = line.split('\t'); val query = text(p[1])
            val result = if (p[0] == "advanced") engine.advanced(AdvancedQuery(words = query, name = text(p[2]), collections = p[3].split(',').filter { it.isNotBlank() }.toSet(), grades = p[4].split(',').filter { it.isNotBlank() }.toSet())) else engine.search(query)
            val suggestions = engine.suggestTopics(query, names, 5).map { it.id }
            out.write("{\"urns\":" + list(result.urns) + ",\"pinned\":" + list(result.pinned) + ",\"topics\":" + list(suggestions) + ",\"corrections\":" + result.corrections.entries.joinToString(",", "{", "}") { json(it.key) + ":" + json(it.value) } + "}\n")
        }
    }
    val widget = File(dir, "widget.tsv").readLines().map { it.split('\t') }
    val cycle = widget.indices.toList().shuffled(Random(0x4861646974L))
    File(dir, "widget.json").writeText(cycle.joinToString(",", "[", "]") { i ->
        val p = widget[i]; val quote = WidgetQuotes.extract(text(p[1]), text(p[2])) ?: error("Pool quote failed: ${p[0]}")
        "{\"urn\":" + json(p[0]) + ",\"text\":" + json(quote.text) + ",\"narrator\":" + json(quote.narrator) + "}"
    })
    File(dir, "readable.json").writeText(list(File(dir, "daily.tsv").readLines().map { it.split('\t') }.filter { text(it[1]).length <= 600 && NarrationClassifier.assess(text(it[1])).isClean }.map { it[0] }))
    val start = LocalDate.from(HijrahDate.of(1300, 1, 1)); val end = LocalDate.from(HijrahDate.of(1600, 12, 1)).plusDays(HijrahDate.of(1600, 12, 1).lengthOfMonth().toLong() - 1)
    val months = mutableListOf<String>(); var date = start
    while (date <= end) {
        val h = HijrahDate.from(date)
        if (h.get(ChronoField.DAY_OF_MONTH) == 1) months += "[" + date.toEpochDay() + "," + h.get(ChronoField.YEAR) + "," + h.get(ChronoField.MONTH_OF_YEAR) + "]"
        date = date.plusDays(1)
    }
    months += "[" + end.plusDays(1).toEpochDay() + ",1601,1]"
    File(dir, "hijri.json").writeText(months.joinToString(",", "[", "]"))
}
