-- Seed data: CCSS Math Standards G3-5
-- Each standard includes code, description, subject, grade, category

-- Grade 3 OA
INSERT INTO curriculum_standards (id, code, description, subject, grade_level, category, subcategory, dok_levels, sequence_order, created_at)
VALUES
('ss-001', 'CCSS.MATH.CONTENT.3.OA.A.1', 'Interpret products of whole numbers, e.g., interpret 5 × 7 as the total number of objects in 5 groups of 7 objects each.', 'math', '3', 'OA', 'Multiplication', '[1,2]', 1, datetime('now')),
('ss-002', 'CCSS.MATH.CONTENT.3.OA.A.2', 'Interpret whole-number quotients of whole numbers.', 'math', '3', 'OA', 'Division', '[1,2]', 2, datetime('now')),
('ss-003', 'CCSS.MATH.CONTENT.3.OA.A.3', 'Use multiplication and division within 100 to solve word problems.', 'math', '3', 'OA', 'Word Problems', '[2,3]', 3, datetime('now')),
('ss-004', 'CCSS.MATH.CONTENT.3.OA.B.5', 'Apply properties of operations as strategies to multiply and divide.', 'math', '3', 'OA', 'Properties', '[1,2]', 4, datetime('now')),
('ss-005', 'CCSS.MATH.CONTENT.3.OA.C.7', 'Fluently multiply and divide within 100.', 'math', '3', 'OA', 'Fluency', '[1]', 5, datetime('now')),
('ss-006', 'CCSS.MATH.CONTENT.3.OA.D.8', 'Solve two-step word problems using the four operations.', 'math', '3', 'OA', 'Two-Step Problems', '[2,3]', 6, datetime('now')),
('ss-007', 'CCSS.MATH.CONTENT.3.NBT.A.1', 'Use place value understanding to round whole numbers to the nearest 10 or 100.', 'math', '3', 'NBT', 'Rounding', '[1,2]', 7, datetime('now')),
('ss-008', 'CCSS.MATH.CONTENT.3.NBT.A.2', 'Fluently add and subtract within 1000.', 'math', '3', 'NBT', 'Addition/Subtraction', '[1]', 8, datetime('now')),
('ss-009', 'CCSS.MATH.CONTENT.3.NF.A.1', 'Understand a fraction 1/b as the quantity formed by 1 part when a whole is partitioned into b equal parts.', 'math', '3', 'NF', 'Unit Fractions', '[1,2]', 9, datetime('now')),
('ss-010', 'CCSS.MATH.CONTENT.3.NF.A.2', 'Understand a fraction as a number on the number line.', 'math', '3', 'NF', 'Number Line', '[2]', 10, datetime('now')),
('ss-011', 'CCSS.MATH.CONTENT.3.NF.A.3', 'Explain equivalence of fractions and compare fractions.', 'math', '3', 'NF', 'Equivalence', '[2,3]', 11, datetime('now')),
('ss-012', 'CCSS.MATH.CONTENT.3.MD.C.7', 'Relate area to the operations of multiplication and addition.', 'math', '3', 'MD', 'Area', '[2,3]', 12, datetime('now')),
('ss-013', 'CCSS.MATH.CONTENT.3.MD.D.8', 'Solve real world and mathematical problems involving perimeters of polygons.', 'math', '3', 'MD', 'Perimeter', '[2,3]', 13, datetime('now'));

-- Grade 4 NF (MVP focus)
INSERT INTO curriculum_standards (id, code, description, subject, grade_level, category, subcategory, dok_levels, sequence_order, created_at)
VALUES
('ss-101', 'CCSS.MATH.CONTENT.4.OA.A.1', 'Interpret a multiplication equation as a comparison.', 'math', '4', 'OA', 'Multiplicative Comparison', '[2]', 14, datetime('now')),
('ss-102', 'CCSS.MATH.CONTENT.4.OA.A.3', 'Solve multistep word problems posed with whole numbers and having whole-number answers using the four operations.', 'math', '4', 'OA', 'Multi-Step', '[2,3]', 15, datetime('now')),
('ss-103', 'CCSS.MATH.CONTENT.4.OA.B.4', 'Find all factor pairs for a whole number in the range 1-100. Recognize that a whole number is a multiple of each of its factors.', 'math', '4', 'OA', 'Factors/Multiples', '[1,2]', 16, datetime('now')),
('ss-104', 'CCSS.MATH.CONTENT.4.NBT.A.1', 'Recognize that in a multi-digit whole number, a digit in one place represents ten times what it represents in the place to its right.', 'math', '4', 'NBT', 'Place Value', '[1,2]', 17, datetime('now')),
('ss-105', 'CCSS.MATH.CONTENT.4.NBT.B.4', 'Fluently add and subtract multi-digit whole numbers using the standard algorithm.', 'math', '4', 'NBT', 'Addition/Subtraction', '[1]', 18, datetime('now')),
('ss-106', 'CCSS.MATH.CONTENT.4.NBT.B.5', 'Multiply a whole number of up to four digits by a one-digit whole number, and multiply two two-digit numbers.', 'math', '4', 'NBT', 'Multiplication', '[1,2]', 19, datetime('now')),
('ss-107', 'CCSS.MATH.CONTENT.4.NBT.B.6', 'Find whole-number quotients and remainders with up to four-digit dividends and one-digit divisors.', 'math', '4', 'NBT', 'Division', '[1,2]', 20, datetime('now')),
('ss-108', 'CCSS.MATH.CONTENT.4.NF.A.1', 'Explain why a fraction a/b is equivalent to a fraction (n × a)/(n × b).', 'math', '4', 'NF', 'Equivalent Fractions', '[2,3]', 21, datetime('now')),
('ss-109', 'CCSS.MATH.CONTENT.4.NF.A.2', 'Compare two fractions with different numerators and different denominators.', 'math', '4', 'NF', 'Comparing Fractions', '[2,3]', 22, datetime('now')),
('ss-110', 'CCSS.MATH.CONTENT.4.NF.B.3a', 'Understand addition and subtraction of fractions as joining and separating parts referring to the same whole.', 'math', '4', 'NF', 'Add/Subtract Fractions', '[1,2]', 23, datetime('now')),
('ss-111', 'CCSS.MATH.CONTENT.4.NF.B.3b', 'Decompose a fraction into a sum of fractions with the same denominator.', 'math', '4', 'NF', 'Decompose Fractions', '[2]', 24, datetime('now')),
('ss-112', 'CCSS.MATH.CONTENT.4.NF.B.3c', 'Add and subtract mixed numbers with like denominators.', 'math', '4', 'NF', 'Mixed Numbers', '[1,2]', 25, datetime('now')),
('ss-113', 'CCSS.MATH.CONTENT.4.NF.B.3d', 'Solve word problems involving addition and subtraction of fractions referring to the same whole and having like denominators.', 'math', '4', 'NF', 'Fraction Word Problems', '[2,3]', 26, datetime('now')),
('ss-114', 'CCSS.MATH.CONTENT.4.NF.B.4a', 'Understand a fraction a/b as a multiple of 1/b.', 'math', '4', 'NF', 'Fraction Multiples', '[2]', 27, datetime('now')),
('ss-115', 'CCSS.MATH.CONTENT.4.NF.B.4b', 'Multiply a fraction by a whole number.', 'math', '4', 'NF', 'Fraction × Whole', '[2]', 28, datetime('now')),
('ss-116', 'CCSS.MATH.CONTENT.4.NF.C.5', 'Express a fraction with denominator 10 as an equivalent fraction with denominator 100.', 'math', '4', 'NF', 'Decimal Fractions', '[1,2]', 29, datetime('now')),
('ss-117', 'CCSS.MATH.CONTENT.4.NF.C.6', 'Use decimal notation for fractions with denominators 10 or 100.', 'math', '4', 'NF', 'Decimal Notation', '[1]', 30, datetime('now')),
('ss-118', 'CCSS.MATH.CONTENT.4.NF.C.7', 'Compare two decimals to hundredths by reasoning about their size.', 'math', '4', 'NF', 'Compare Decimals', '[2]', 31, datetime('now')),
('ss-119', 'CCSS.MATH.CONTENT.4.MD.A.3', 'Apply the area and perimeter formulas for rectangles in real world and mathematical problems.', 'math', '4', 'MD', 'Area/Perimeter', '[2,3]', 32, datetime('now'));

-- Grade 5 NF
INSERT INTO curriculum_standards (id, code, description, subject, grade_level, category, subcategory, dok_levels, sequence_order, created_at)
VALUES
('ss-201', 'CCSS.MATH.CONTENT.5.OA.A.1', 'Use parentheses, brackets, or braces in numerical expressions, and evaluate expressions with these symbols.', 'math', '5', 'OA', 'Expressions', '[1,2]', 33, datetime('now')),
('ss-202', 'CCSS.MATH.CONTENT.5.OA.A.2', 'Write simple expressions that record calculations with numbers, and interpret numerical expressions without evaluating them.', 'math', '5', 'OA', 'Write Expressions', '[2]', 34, datetime('now')),
('ss-203', 'CCSS.MATH.CONTENT.5.NBT.A.1', 'Recognize that in a multi-digit number, a digit in one place represents 10 times as much as it represents in the place to its right and 1/10 of what it represents in the place to its left.', 'math', '5', 'NBT', 'Place Value', '[1,2]', 35, datetime('now')),
('ss-204', 'CCSS.MATH.CONTENT.5.NBT.B.5', 'Fluently multiply multi-digit whole numbers using the standard algorithm.', 'math', '5', 'NBT', 'Multiplication', '[1]', 36, datetime('now')),
('ss-205', 'CCSS.MATH.CONTENT.5.NBT.B.6', 'Find whole-number quotients of whole numbers with up to four-digit dividends and two-digit divisors.', 'math', '5', 'NBT', 'Division', '[1,2]', 37, datetime('now')),
('ss-206', 'CCSS.MATH.CONTENT.5.NBT.B.7', 'Add, subtract, multiply, and divide decimals to hundredths.', 'math', '5', 'NBT', 'Decimal Operations', '[1,2]', 38, datetime('now')),
('ss-207', 'CCSS.MATH.CONTENT.5.NF.A.1', 'Add and subtract fractions with unlike denominators (including mixed numbers).', 'math', '5', 'NF', 'Unlike Denominators', '[1,2]', 39, datetime('now')),
('ss-208', 'CCSS.MATH.CONTENT.5.NF.A.2', 'Solve word problems involving addition and subtraction of fractions referring to the same whole, including cases of unlike denominators.', 'math', '5', 'NF', 'Fraction Word Problems', '[2,3]', 40, datetime('now')),
('ss-209', 'CCSS.MATH.CONTENT.5.NF.B.3', 'Interpret a fraction as division of the numerator by the denominator (a/b = a ÷ b).', 'math', '5', 'NF', 'Fraction as Division', '[2]', 41, datetime('now')),
('ss-210', 'CCSS.MATH.CONTENT.5.NF.B.4', 'Apply and extend previous understandings of multiplication to multiply a fraction or whole number by a fraction.', 'math', '5', 'NF', 'Multiply Fractions', '[2]', 42, datetime('now')),
('ss-211', 'CCSS.MATH.CONTENT.5.NF.B.6', 'Solve real world problems involving multiplication of fractions and mixed numbers.', 'math', '5', 'NF', 'Fraction × Fraction', '[2,3]', 43, datetime('now')),
('ss-212', 'CCSS.MATH.CONTENT.5.NF.B.7', 'Apply and extend previous understandings of division to divide unit fractions by whole numbers and whole numbers by unit fractions.', 'math', '5', 'NF', 'Divide Unit Fractions', '[2,3]', 44, datetime('now')),
('ss-213', 'CCSS.MATH.CONTENT.5.MD.C.5', 'Relate volume to the operations of multiplication and addition and solve real world and mathematical problems involving volume.', 'math', '5', 'MD', 'Volume', '[2,3]', 45, datetime('now'));
