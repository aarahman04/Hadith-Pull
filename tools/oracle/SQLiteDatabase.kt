// Read-only JDBC adapter for executing the unchanged Android SearchEngine on a desktop JVM.
package android.database.sqlite

import java.sql.DriverManager

class SQLiteDatabase(path: String) : AutoCloseable {
    private val connection = DriverManager.getConnection("jdbc:sqlite:file:$path?mode=ro")
    fun rawQuery(sql: String, args: Array<String>?): Cursor {
        connection.prepareStatement(sql).use { stmt ->
            args?.forEachIndexed { i, value -> stmt.setString(i + 1, value) }
            stmt.executeQuery().use { rows ->
                val out = mutableListOf<List<Any?>>()
                while (rows.next()) out += (1..rows.metaData.columnCount).map { rows.getObject(it) }
                return Cursor(out)
            }
        }
    }
    override fun close() = connection.close()
}
