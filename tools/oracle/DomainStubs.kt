// WidgetQuotes itself is unchanged. These types satisfy the unused eligibility helper in the same file.
package online.hadithpull.app.domain
enum class Grading { SAHIH }
data class Primary(val cat: Grading)
data class Hadith(val primary: Primary?, val ref: String, val english: String, val narrator: String)
