import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { WorkbookOutput, QuestionOutput } from "@/types";

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
  watermarkBanner: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "bold",
    color: "#dc2626",
    textTransform: "uppercase",
    letterSpacing: 2,
    backgroundColor: "#fef2f2",
    paddingVertical: 4,
    borderBottom: "1 solid #fecaca",
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#1e1b4b",
  },
  coverLabel: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    color: "#dc2626",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 2,
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
  teacherNameRow: {
    marginTop: 40,
    width: "60%",
    borderBottom: "1 solid #64748b",
    paddingBottom: 4,
  },
  teacherNameLabel: {
    fontSize: 10,
    color: "#94a3b8",
    marginBottom: 4,
  },
  teacherNameLine: {
    fontSize: 14,
    color: "#1e293b",
  },

  // Quick answer grid
  answerGridPage: {
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
  },
  answerGridTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#1e1b4b",
  },
  answerGridSubtitle: {
    fontSize: 10,
    textAlign: "center",
    color: "#94a3b8",
    marginBottom: 24,
  },
  answerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  answerCell: {
    width: "18%",
    border: "0.5 solid #e2e8f0",
    padding: 6,
    marginBottom: 4,
  },
  answerCellNumber: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 2,
  },
  answerCellAnswer: {
    fontSize: 9,
    color: "#0f172a",
    fontWeight: "bold",
  },

  // Question styles
  questionContainer: {
    marginBottom: 22,
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

  // Answer section
  answerSection: {
    backgroundColor: "#f8fafc",
    borderLeft: "3 solid #4f46e5",
    padding: 10,
    marginLeft: 4,
    marginTop: 6,
    gap: 6,
  },
  answerLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  answerText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  solutionLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
    marginTop: 4,
  },
  solutionText: {
    fontSize: 10,
    color: "#475569",
    lineHeight: 1.5,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  standardTag: {
    fontSize: 8,
    color: "#475569",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
  },
  difficultyTag: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "capitalize",
  },
  confidenceIndicator: {
    fontSize: 8,
    color: "#64748b",
  },

  // Rubric section
  rubricPage: {
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 50,
    fontFamily: "Helvetica",
  },
  rubricTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#1e1b4b",
    textAlign: "center",
  },
  rubricCriterion: {
    marginBottom: 18,
  },
  rubricCriterionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 6,
  },
  rubricMaxScore: {
    fontSize: 10,
    color: "#64748b",
  },
  rubricTable: {
    borderTop: "0.5 solid #e2e8f0",
    borderBottom: "0.5 solid #e2e8f0",
  },
  rubricRow: {
    flexDirection: "row",
    borderBottom: "0.5 solid #f1f5f9",
    paddingVertical: 5,
  },
  rubricScore: {
    width: 40,
    fontSize: 10,
    fontWeight: "bold",
    color: "#4f46e5",
  },
  rubricDescription: {
    flex: 1,
    fontSize: 10,
    color: "#475569",
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
  footerConfidential: {
    fontSize: 8,
    color: "#dc2626",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  pageNumber: {
    fontSize: 8,
    color: "#94a3b8",
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

const confidenceColor = (confidence: string): string => {
  switch (confidence) {
    case "high":
      return "#10b981";
    case "medium":
      return "#f59e0b";
    case "low":
      return "#ef4444";
    default:
      return "#94a3b8";
  }
};

function TeacherQuestionBlock({
  question,
  number,
}: {
  question: QuestionOutput;
  number: number;
}) {
  return (
    <View style={styles.questionContainer} wrap={false}>
      {/* Header */}
      <View style={styles.questionHeader}>
        <Text style={styles.questionNumber}>Q{number}</Text>
        <Text style={styles.questionType}>{typeLabel(question.type)}</Text>
        <Text style={styles.points}>
          {question.points} pt{question.points !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Question text */}
      <Text style={styles.questionText}>{question.questionText}</Text>

      {/* Answer section */}
      <View style={styles.answerSection}>
        <Text style={styles.answerLabel}>Correct Answer</Text>
        <Text style={styles.answerText}>{question.correctAnswer}</Text>

        {/* Show options with correct one highlighted for MC */}
        {question.type === "multiple_choice" && question.options && (
          <View style={{ gap: 2, marginBottom: 4 }}>
            {question.options.map((opt, i) => {
              const isCorrect = opt.startsWith(
                question.correctAnswer.split(")")[0]
              );
              return (
                <Text
                  key={i}
                  style={{
                    fontSize: 10,
                    color: isCorrect ? "#0f172a" : "#94a3b8",
                    fontWeight: isCorrect ? "bold" : "normal",
                  }}
                >
                  {String.fromCharCode(65 + i)}){" "}
                  {opt.replace(/^[A-D]\) /, "")}
                  {isCorrect ? "  ✓" : ""}
                </Text>
              );
            })}
          </View>
        )}

        <Text style={styles.solutionLabel}>Solution</Text>
        <Text style={styles.solutionText}>{question.solution}</Text>

        {/* Metadata */}
        <View style={styles.metadataRow}>
          {question.standardCode && (
            <Text style={styles.standardTag}>{question.standardCode}</Text>
          )}
          <Text style={styles.difficultyTag}>
            {question.difficulty.replace(/_/g, " ")}
          </Text>
          <Text
            style={{
              ...styles.confidenceIndicator,
              color: confidenceColor(question.confidence),
            }}
          >
            ● {question.confidence} confidence
          </Text>
        </View>
      </View>
    </View>
  );
}

function QuickAnswerGrid({ questions }: { questions: QuestionOutput[] }) {
  return (
    <Page size="LETTER" style={styles.answerGridPage}>
      <Text style={styles.answerGridTitle}>Quick Answer Key</Text>
      <Text style={styles.answerGridSubtitle}>
        Answer at a glance — {questions.length} questions
      </Text>

      <View style={styles.answerGrid}>
        {questions.map((q, i) => (
          <View key={i} style={styles.answerCell}>
            <Text style={styles.answerCellNumber}>Q{i + 1}</Text>
            <Text style={styles.answerCellAnswer}>
              {q.type === "multiple_choice"
                ? q.correctAnswer.split(")")[0]
                : q.type === "true_false"
                ? q.correctAnswer === "True"
                  ? "T"
                  : "F"
                : q.correctAnswer.length > 20
                ? q.correctAnswer.substring(0, 20) + "..."
                : q.correctAnswer}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerConfidential}>Teacher Copy — Confidential</Text>
        <Text style={styles.pageNumber}>Quick Answer Key</Text>
      </View>
    </Page>
  );
}

function RubricPage({ rubric }: { rubric: NonNullable<WorkbookOutput["rubric"]> }) {
  return (
    <Page size="LETTER" style={styles.rubricPage}>
      <Text style={styles.rubricTitle}>Grading Rubric</Text>

      {rubric.map((criterion, i) => (
        <View key={i} style={styles.rubricCriterion}>
          <Text style={styles.rubricCriterionTitle}>
            {criterion.criteria}
            <Text style={styles.rubricMaxScore}>
              {"  "}(max {criterion.maxScore} points)
            </Text>
          </Text>

          <View style={styles.rubricTable}>
            {criterion.scoreLevels.map((level, j) => (
              <View key={j} style={styles.rubricRow}>
                <Text style={styles.rubricScore}>{level.score}</Text>
                <Text style={styles.rubricDescription}>{level.description}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Practice Packs</Text>
        <Text style={styles.pageNumber}>Grading Rubric</Text>
      </View>
    </Page>
  );
}

interface TeacherCopyPDFProps {
  workbook: WorkbookOutput;
}

export function TeacherCopyPDF({ workbook }: TeacherCopyPDFProps) {
  return (
    <Document
      title={`${workbook.title} — Teacher Copy`}
      author="Practice Packs"
      subject={`${workbook.subject} - ${workbook.gradeLevel} - Answer Key`}
      keywords="teacher, answer key, rubric, printable"
    >
      {/* Quick Answer Grid Page */}
      <QuickAnswerGrid questions={workbook.questions} />

      {/* Cover Page */}
      <Page size="LETTER" style={styles.coverPage}>
        <View style={styles.watermarkBanner}>
          <Text>TEACHER COPY — ANSWER KEY — CONFIDENTIAL</Text>
        </View>

        <Text style={styles.coverMeta}>
          {workbook.subject.toUpperCase()} &middot; {workbook.gradeLevel}
        </Text>
        <Text style={styles.coverTitle}>{workbook.title}</Text>
        <Text style={styles.coverLabel}>Teacher Copy — Answer Key</Text>
        <Text style={styles.coverSubtitle}>{workbook.description}</Text>

        <View style={styles.coverLine} />

        <Text style={styles.coverInfo}>
          {workbook.questions.length} Questions &middot; {workbook.estimatedTime} Estimated Time
        </Text>

        <View style={styles.teacherNameRow}>
          <Text style={styles.teacherNameLabel}>Teacher</Text>
          <Text style={styles.teacherNameLine}>___________________________</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerConfidential}>Teacher Copy — Do Not Distribute to Students</Text>
          <Text style={styles.pageNumber}>Teacher Copy</Text>
        </View>
      </Page>

      {/* Question pages with answers */}
      <Page size="LETTER" style={styles.page}>
        {workbook.questions.map((question, index) => (
          <TeacherQuestionBlock
            key={index}
            question={question}
            number={index + 1}
          />
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerConfidential}>Teacher Copy</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages} — Teacher Copy`
            }
          />
        </View>
      </Page>

      {/* Rubric pages */}
      {workbook.rubric && workbook.rubric.length > 0 && (
        <RubricPage rubric={workbook.rubric} />
      )}
    </Document>
  );
}
