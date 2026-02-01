import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class PollResultsSummary {
    private static final String DATA_DIR = "pollresults_resultatsbureauCanada";
    private static final String OUTPUT_FILE = "output_java.csv";

    public static void main(String[] args) throws IOException {
        Path baseDir = Paths.get("").toAbsolutePath();
        Path dataDir = baseDir.resolve(DATA_DIR);

        if (!Files.isDirectory(dataDir)) {
            throw new IllegalStateException("Missing data directory: " + dataDir);
        }

        List<Path> csvFiles;
        try (Stream<Path> stream = Files.list(dataDir)) {
            csvFiles = stream
                    .filter(p -> p.getFileName().toString().startsWith("pollresults_resultatsbureau")
                            && p.getFileName().toString().endsWith(".csv"))
                    .sorted()
                    .collect(Collectors.toList());
        }

        if (csvFiles.isEmpty()) {
            throw new IllegalStateException("No CSV files found in: " + dataDir);
        }

        Map<ResultKey, Long> totals = new HashMap<>();

        for (Path csvFile : csvFiles) {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                    Files.newInputStream(csvFile), StandardCharsets.UTF_8))) {

                String headerLine = reader.readLine();
                if (headerLine == null) {
                    continue;
                }

                List<String> header = parseCsvLine(stripBom(headerLine));
                Map<String, Integer> idx = indexMap(header);

                String line;
                while ((line = reader.readLine()) != null) {
                    List<String> fields = parseCsvLine(line);

                    String distNum = getField(fields, idx, "Electoral District Number/Numéro de circonscription");
                    String distName = getField(fields, idx, "Electoral District Name_English/Nom de circonscription_Anglais");
                    String family = getField(fields, idx, "Candidate’s Family Name/Nom de famille du candidat");
                    String middle = getField(fields, idx, "Candidate’s Middle Name/Second prénom du candidat");
                    String first = getField(fields, idx, "Candidate’s First Name/Prénom du candidat");
                    String party = getField(fields, idx, "Political Affiliation Name_English/Appartenance politique_Anglais");
                    String votesRaw = getField(fields, idx, "Candidate Vote Count/Votes du candidat");

                    if (isBlank(distNum) || isBlank(distName) || isBlank(family) || isBlank(first)
                            || isBlank(party) || isBlank(votesRaw)) {
                        continue;
                    }

                    String fullName = String.join(" ",
                            Stream.of(first, middle, family).filter(s -> !isBlank(s)).collect(Collectors.toList()));

                    ResultKey key = new ResultKey(distNum.trim(), distName.trim(), fullName.trim(), party.trim());
                    long votes = Long.parseLong(votesRaw.trim());
                    totals.merge(key, votes, Long::sum);
                }
            }
        }

        List<ResultRow> rows = new ArrayList<>();
        for (Map.Entry<ResultKey, Long> entry : totals.entrySet()) {
            ResultKey key = entry.getKey();
            rows.add(new ResultRow(key.districtNumber, key.districtName, key.candidateName, key.party, entry.getValue()));
        }

        rows.sort(Comparator
                .comparingInt((ResultRow r) -> Integer.parseInt(r.districtNumber))
                .thenComparing(r -> r.candidateName));

        Path outputPath = baseDir.resolve(OUTPUT_FILE);
        try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(
                Files.newOutputStream(outputPath), StandardCharsets.UTF_8))) {
            writer.write("Electoral District Number,Electoral District Name,Candidate Full Name,Political Party,Total Votes");
            writer.newLine();
            for (ResultRow row : rows) {
                writer.write(toCsvRow(row));
                writer.newLine();
            }
        }

        for (ResultRow row : rows) {
            System.out.println(row.districtNumber + "\t" + row.districtName + "\t" + row.candidateName
                    + "\t" + row.party + "\t" + row.totalVotes);
        }
    }

    private static String stripBom(String value) {
        if (value != null && !value.isEmpty() && value.charAt(0) == '\ufeff') {
            return value.substring(1);
        }
        return value;
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private static Map<String, Integer> indexMap(List<String> header) {
        Map<String, Integer> map = new HashMap<>();
        for (int i = 0; i < header.size(); i++) {
            map.put(header.get(i), i);
        }
        return map;
    }

    private static String getField(List<String> fields, Map<String, Integer> idx, String name) {
        Integer i = idx.get(name);
        if (i == null || i < 0 || i >= fields.size()) {
            return "";
        }
        return fields.get(i);
    }

    private static List<String> parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        int i = 0;
        while (i < line.length()) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i += 2;
                    continue;
                }
                inQuotes = !inQuotes;
                i++;
                continue;
            }
            if (ch == ',' && !inQuotes) {
                fields.add(current.toString());
                current.setLength(0);
                i++;
                continue;
            }
            current.append(ch);
            i++;
        }
        fields.add(current.toString());
        return fields;
    }

    private static String toCsvRow(ResultRow row) {
        return String.join(",",
                escapeCsv(row.districtNumber),
                escapeCsv(row.districtName),
                escapeCsv(row.candidateName),
                escapeCsv(row.party),
                String.valueOf(row.totalVotes));
    }

    private static String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        boolean needsQuotes = value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r");
        String escaped = value.replace("\"", "\"\"");
        return needsQuotes ? ("\"" + escaped + "\"") : escaped;
    }

    private static class ResultKey {
        private final String districtNumber;
        private final String districtName;
        private final String candidateName;
        private final String party;

        private ResultKey(String districtNumber, String districtName, String candidateName, String party) {
            this.districtNumber = districtNumber;
            this.districtName = districtName;
            this.candidateName = candidateName;
            this.party = party;
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) {
                return true;
            }
            if (obj == null || getClass() != obj.getClass()) {
                return false;
            }
            ResultKey other = (ResultKey) obj;
            return districtNumber.equals(other.districtNumber)
                    && districtName.equals(other.districtName)
                    && candidateName.equals(other.candidateName)
                    && party.equals(other.party);
        }

        @Override
        public int hashCode() {
            int result = districtNumber.hashCode();
            result = 31 * result + districtName.hashCode();
            result = 31 * result + candidateName.hashCode();
            result = 31 * result + party.hashCode();
            return result;
        }
    }

    private static class ResultRow {
        private final String districtNumber;
        private final String districtName;
        private final String candidateName;
        private final String party;
        private final long totalVotes;

        private ResultRow(String districtNumber, String districtName, String candidateName, String party, long totalVotes) {
            this.districtNumber = districtNumber;
            this.districtName = districtName;
            this.candidateName = candidateName;
            this.party = party;
            this.totalVotes = totalVotes;
        }
    }
}
