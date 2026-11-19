export function computerSciencePractical(grade: number) {
  if (grade === 11) return {
    tasks: `## Stage I · 7 marks
1. Ask the user for a positive integer n. (1 mark)
2. Print the numbers from 1 to n, skipping all multiples of 3. (2 marks)
3. Use a for loop and a continue statement. (2 marks)
4. Count and print the number of values printed. (2 marks)

## Stage II · 3 marks
5. Save the program using your candidate ID. (1 mark)
6. Print the source program and its output with your candidate ID and centre ID. (2 marks)

## Stage III · 2 marks
7. Draw a flowchart or write an algorithm for these tasks. (2 marks)

School or college record carries 3 marks.`,
    solution: `The following solution uses sample identification fields. Replace them with the candidate and centre IDs before submission.

\`\`\`python
candidate_id = input("Candidate ID: ")
centre_id = input("Centre ID: ")
n = int(input("Enter a positive integer: "))
while n <= 0:
    n = int(input("Enter a positive integer: "))

print("Candidate ID:", candidate_id)
print("Centre ID:", centre_id)
count = 0
for number in range(1, n + 1):
    if number % 3 == 0:
        continue
    print(number)
    count += 1
print("Total values printed:", count)
\`\`\`

For n = 10, the values printed are 1, 2, 4, 5, 7, 8 and 10. The count is 7.

Algorithm
1. Start and read the identification fields and positive integer n.
2. Set count to zero.
3. For each integer from 1 through n, skip it if divisible by 3.
4. Otherwise print it and increase count by one.
5. Print count and stop.

Save the source as your candidate ID followed by .py. Print the saved source and captured output using the IDE or operating system print function.`,
  };
  return {
    tasks: `## Section A · Python programming · 7 marks
Store details for three students in a dictionary named students. Use each roll number as a key and a list of three subject marks as its value.
1. Create the dictionary for three students. (1 mark)
2. Define calculate_average(marks) to return their average. (2 marks)
3. Use a for loop to display each roll number and average. Save the program with your ID. (3 marks)
4. Print the source and output with your ID and centre ID. (1 mark)

## Section B · SQL query · 5 marks
5. Create Student with Roll_No (integer primary key), Name (text) and Marks (integer). Insert the four given records. (2 marks)

| Roll_No | Name | Marks |
| --- | --- | --- |
| 101 | Ayesha Khan | 78 |
| 102 | Bilal Ahmed | 65 |
| 103 | Zara Malik | 92 |
| 104 | Hamza Sheikh | 54 |

6. Display Name and Marks for students scoring more than 70, sorted by Marks in descending order. (2 marks)
7. Print the queries and their output with your ID and centre ID. (1 mark)

School or college record carries 3 marks.`,
    solution: `The three Python student records below are example input data. The SQL records reproduce the supplied table.

\`\`\`python
candidate_id = input("Candidate ID: ")
centre_id = input("Centre ID: ")
students = {
    101: [78, 85, 90],
    102: [65, 70, 75],
    103: [92, 88, 90],
}

def calculate_average(marks):
    return sum(marks) / len(marks)

print("Candidate ID:", candidate_id)
print("Centre ID:", centre_id)
for roll_number, marks in students.items():
    print(roll_number, calculate_average(marks))
\`\`\`

The averages are approximately 84.3333, 70 and 90 respectively.

\`\`\`sql
CREATE TABLE Student (
    Roll_No INT PRIMARY KEY,
    Name VARCHAR(100),
    Marks INT
);

INSERT INTO Student (Roll_No, Name, Marks)
VALUES
    (101, 'Ayesha Khan', 78),
    (102, 'Bilal Ahmed', 65),
    (103, 'Zara Malik', 92),
    (104, 'Hamza Sheikh', 54);

SELECT Name, Marks
FROM Student
WHERE Marks > 70
ORDER BY Marks DESC;
\`\`\`

| Name | Marks |
| --- | --- |
| Zara Malik | 92 |
| Ayesha Khan | 78 |

VARCHAR stores the names as text in MS SQL. Save the Python source using your candidate ID. Print the source, SQL queries and outputs with your identification fields.`,
  };
}
