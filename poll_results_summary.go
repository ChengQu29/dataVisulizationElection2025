package main

import (
	"bufio"
	"encoding/csv"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

type resultKey struct {
	districtNumber string
	districtName   string
	candidateName  string
	party          string
}

type resultRow struct {
	districtNumber string
	districtName   string
	candidateName  string
	party          string
	totalVotes     int64
}

const (
	dataDir    = "pollresults_resultatsbureauCanada"
	outputFile = "output_go.csv"
)

func main() {
	files, err := filepath.Glob(filepath.Join(dataDir, "pollresults_resultatsbureau*.csv"))
	if err != nil {
		panic(err)
	}
	if len(files) == 0 {
		panic("no CSV files found")
	}
	sort.Strings(files)

	totals := make(map[resultKey]int64)

	for _, file := range files {
		//Maps are reference types in Go (along with slices and channels)
		if err := processFile(file, totals); err != nil {
			panic(err)
		}
	}

	// convert from map -> slice
	rows := make([]resultRow, 0, len(totals))
	for key, total := range totals {
		rows = append(rows, resultRow{
			districtNumber: key.districtNumber,
			districtName:   key.districtName,
			candidateName:  key.candidateName,
			party:          key.party,
			totalVotes:     total,
		})
	}

	//sort by name
	sort.Slice(rows, func(i, j int) bool {
		a, b := rows[i], rows[j]
		ai, _ := strconv.Atoi(a.districtNumber)
		bi, _ := strconv.Atoi(b.districtNumber)
		if ai != bi {
			return ai < bi
		}
		return a.candidateName < b.candidateName
	})

	if err := writeOutput(rows); err != nil {
		panic(err)
	}

	for _, row := range rows {
		fmt.Printf("%s\t%s\t%s\t%s\t%d\n", row.districtNumber, row.districtName, row.candidateName, row.party, row.totalVotes)
	}
}

func processFile(path string, totals map[resultKey]int64) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()

	reader := csv.NewReader(bufio.NewReader(file))
	reader.FieldsPerRecord = -1

	header, err := reader.Read()
	if err == io.EOF {
		return nil
	}
	if err != nil {
		return err
	}
	if len(header) > 0 {
		header[0] = strings.TrimPrefix(header[0], "\ufeff")
	}

	idx := make(map[string]int)
	for i, name := range header {
		idx[name] = i
	}

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		distNum := getField(record, idx, "Electoral District Number/Numéro de circonscription")
		distName := getField(record, idx, "Electoral District Name_English/Nom de circonscription_Anglais")
		family := getField(record, idx, "Candidate’s Family Name/Nom de famille du candidat")
		middle := getField(record, idx, "Candidate’s Middle Name/Second prénom du candidat")
		first := getField(record, idx, "Candidate’s First Name/Prénom du candidat")
		party := getField(record, idx, "Political Affiliation Name_English/Appartenance politique_Anglais")
		votesRaw := getField(record, idx, "Candidate Vote Count/Votes du candidat")

		if isBlank(distNum) || isBlank(distName) || isBlank(family) || isBlank(first) || isBlank(party) || isBlank(votesRaw) {
			continue
		}

		fullName := strings.TrimSpace(strings.Join(nonEmpty(first, middle, family), " "))
		votes, err := strconv.ParseInt(strings.TrimSpace(votesRaw), 10, 64)
		if err != nil {
			return err
		}

		key := resultKey{
			districtNumber: strings.TrimSpace(distNum),
			districtName:   strings.TrimSpace(distName),
			candidateName:  fullName,
			party:          strings.TrimSpace(party),
		}
		totals[key] += votes
	}

	return nil
}

func getField(record []string, idx map[string]int, name string) string {
	pos, ok := idx[name]
	if !ok || pos < 0 || pos >= len(record) {
		return ""
	}
	return record[pos]
}

func isBlank(value string) bool {
	return strings.TrimSpace(value) == ""
}

func nonEmpty(values ...string) []string {
	out := make([]string, 0, len(values))
	for _, v := range values {
		if !isBlank(v) {
			out = append(out, strings.TrimSpace(v))
		}
	}
	return out
}

func writeOutput(rows []resultRow) error {
	file, err := os.Create(outputFile)
	if err != nil {
		return err
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	if err := writer.Write([]string{"Electoral District Number", "Electoral District Name", "Candidate Full Name", "Political Party", "Total Votes"}); err != nil {
		return err
	}
	for _, row := range rows {
		if err := writer.Write([]string{
			row.districtNumber,
			row.districtName,
			row.candidateName,
			row.party,
			strconv.FormatInt(row.totalVotes, 10),
		}); err != nil {
			return err
		}
	}
	writer.Flush()
	return writer.Error()
}
