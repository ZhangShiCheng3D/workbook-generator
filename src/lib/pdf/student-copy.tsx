import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { WorkbookOutput, QuestionOutput } from "@/types";

// Register fonts (using built-in as fallback)
// Font.register({ family: 'Inter', src: '/fonts/inter-regular.ttf' });

const styles = StyleSheet.create({
  page: {
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 50,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.6,
  },
  // Cover page
  coverPage: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 50,
    fontFamily: "Helvetica",
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    color: "#1e1b4b", // indigo-950
  },
  coverSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    color: "#64748b",
  },
  coverMeta: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 6,
    color: "#475569",
  },
  coverLine: {
    width: 200,
    borderBottom: "1 solid #cbd5e1",
    marginVertical: 20,
  },
  coverInfo: {
    fontSize: 11,
    textAlign: "center",
    color: "#94a3b8",
  },
  studentNameRow: {
    marginTop: 40,
    width: "60%",
    borderBottom: "1 solid #64748b",
    paddingBottom: 4,
  },
  studentNameLabel: {
    fontSize: 10,
    color: "#94a3b8",
    marginBottom: 4,
  },
  studentNameLine: {
    fontSize: 14,
    color: "#1e293b",
  },
  dateRow: {
    marginTop: 20,
    width: "40%",
    borderBottom: "1 solid #64748b",
    paddingBottom: 4,
  },

  // Question styles
  questionContainer: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: "0.5 solid #e2e8f0",
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  questionNumber: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#64748b",
  },
  questionType: {
    fontSize: 9,
    color: "#475569",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    textTransform: "uppercase",
  },
  questionText: {
    fontSize: 12,
    lineHeight: 1.7,
    marginBottom: 10,
    color: "#0f172a",
  },
  points: {
    fontSize: 9,
    color: "#94a3b8",
    marginLeft: "auto",
  },

  // Answer areas by type
  mcOptions: {
    marginLeft: 8,
    gap: 4,
  },
  mcOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    gap: 8,
  },
  mcCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    border: "1.5 solid #94a3b8",
  },
  mcLabel: {
    fontSize: 11,
    color: "#334155",
  },
  trueFalseRow: {
    flexDirection: "row",
    gap: 24,
    marginLeft: 8,
  },
  trueFalseBox: {
    width: 30,
    height: 22,
    border: "1.5 solid #94a3b8",
    justifyContent: "center",
    alignItems: "center",
  },
  trueFalseLabel: {
    fontSize: 11,
    color: "#334155",
  },
  answerLines: {
    gap: 4,
    marginLeft: 8,
  },
  answerLine: {
    borderBottom: "0.5 solid #cbd5e1",
    height: 16,
    marginBottom: 2,
  },
  essayLines: {
    border: "1 solid #cbd5e1",
    borderRadius: 4,
    height: 120,
    padding: 8,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "0.5 solid #e2e8f0",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: "#94a3b8",
  },
  pageNumber: {
    fontSize: 8,
    color: "#94a3b8",
  },
  // Watermark
  watermark: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.06,
  },
  watermarkText: {
    fontSize: 64,
    fontWeight: "bold",
    color: "#64748b",
    transform: "rotate(-30deg)",
    textTransform: "uppercase" as const,
    letterSpacing: 4,
  },
});

const typeLabel = (type: QuestionOutput["type"]): string => {
  const map: Record<string, string> = {
    multiple_choice: "Multiple Choice",
    true_false: "True / False",
    fill_blank: "Fill in the Blank",
    short_answer: "Short Answer",
    essay: "Essay",
    matching: "Matching",
  };
  return map[type] ?? type;
};

function QuestionBlock({ question, number }: { question: QuestionOutput; number: number }) {
  return (
    <View style={styles.questionContainer} wrap={false}>
      {/* Header */}
      <View style={styles.questionHeader}>
        <Text style={styles.questionNumber}>Q{number}</Text>
        <Text style={styles.questionType}>{typeLabel(question.type)}</Text>
        <Text style={styles.points}>{question.points} pt{question.points !== 1 ? "s" : ""}</Text>
      </View>

      {/* Question text */}
      <Text style={styles.questionText}>{question.questionText}</Text>

      {/* Answer area based on type */}
      {question.type === "multiple_choice" && question.options && (
        <View style={styles.mcOptions}>
          {question.options.map((opt, i) => (
            <View key={i} style={styles.mcOption}>
              <View style={styles.mcCircle} />
              <Text style={styles.mcLabel}>
                {String.fromCharCode(65 + i)}) {opt.replace(/^[A-D]\) /, "")}
              </Text>
            </View>
          ))}
        </View>
      )}

      {question.type === "true_false" && (
        <View style={styles.trueFalseRow}>
          <View style={styles.trueFalseBox}>
            <Text style={styles.trueFalseLabel}>T</Text>
          </View>
          <View style={styles.trueFalseBox}>
            <Text style={styles.trueFalseLabel}>F</Text>
          </View>
        </View>
      )}

      {question.type === "fill_blank" && (
        <View style={styles.answerLines}>
          <View style={styles.answerLine} />
        </View>
      )}

      {question.type === "short_answer" && (
        <View style={styles.answerLines}>
          <View style={styles.answerLine} />
          <View style={styles.answerLine} />
          <View style={styles.answerLine} />
        </View>
      )}

      {question.type === "essay" && (
        <View style={styles.essayLines} />
      )}
    </View>
  );
}

interface StudentCopyPDFProps {
  workbook: WorkbookOutput;
  /** Render a "Free Preview" watermark for free-tier users */
  watermark?: boolean;
}

export function StudentCopyPDF({ workbook, watermark = false }: StudentCopyPDFProps) {
  return (
    <Document
      title={workbook.title}
      author="Practice Packs"
      subject={`${workbook.subject} - ${workbook.gradeLevel}`}
      keywords="worksheet, practice, printable"
    >
      {/* Cover Page */}
      <Page size="LETTER" style={styles.coverPage}>
        {watermark && (
          <View style={styles.watermark} fixed>
            <Text style={styles.watermarkText}>Free Preview</Text>
          </View>
        )}
        <Text style={styles.coverMeta}>
          {workbook.subject.toUpperCase()} &middot; {workbook.gradeLevel}
        </Text>
        <Text style={styles.coverTitle}>{workbook.title}</Text>
        <Text style={styles.coverSubtitle}>{workbook.description}</Text>

        <View style={styles.coverLine} />

        <Text style={styles.coverInfo}>
          {workbook.questions.length} Questions &middot; {workbook.estimatedTime} Estimated Time
        </Text>

        <View style={styles.studentNameRow}>
          <Text style={styles.studentNameLabel}>Student Name</Text>
          <Text style={styles.studentNameLine}>___________________________</Text>
        </View>

        <View style={styles.dateRow}>
          <Text style={styles.studentNameLabel}>Date</Text>
          <Text style={styles.studentNameLine}>_________________</Text>
        </View>

        {/* Footer on cover */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Practice Packs</Text>
          <Text style={styles.pageNumber}>Student Copy</Text>
        </View>
      </Page>

      {/* Question pages */}
      <Page size="LETTER" style={styles.page}>
        {watermark && (
          <View style={styles.watermark} fixed>
            <Text style={styles.watermarkText}>Free Preview</Text>
          </View>
        )}
        {workbook.questions.map((question, index) => (
          <QuestionBlock key={index} question={question} number={index + 1} />
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{workbook.title}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages} — Student Copy`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
