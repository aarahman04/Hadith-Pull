package android.database.sqlite;
import java.util.List;
public final class Cursor implements AutoCloseable {
    private final List<? extends List<?>> rows;
    private int index = -1;
    public Cursor(List<? extends List<?>> rows) { this.rows = rows; }
    public boolean moveToNext() { return ++index < rows.size(); }
    public boolean moveToFirst() { index = 0; return !rows.isEmpty(); }
    public int getInt(int i) { Object value = rows.get(index).get(i); return value == null ? 0 : ((Number)value).intValue(); }
    public String getString(int i) { Object value = rows.get(index).get(i); return value == null ? null : value.toString(); }
    public byte[] getBlob(int i) { return (byte[])rows.get(index).get(i); }
    public boolean isNull(int i) { return rows.get(index).get(i) == null; }
    public void close() {}
}
