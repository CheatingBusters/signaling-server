require('dotenv').config()
const express = require('express')
const http = require('http')
const socket = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = socket(server, { origins: '*:*' })

/*******************************************************************************
testingrooms: {
  teacher: {
    socketID: 'string(hash)',
    teacherID: 'string(uuid)'
  },
  students: [
    {
      socketID: 'string(hash)',
      studentID: 'string(uuid)'
    },
    ...(up to 4 items)
  ]
}
*******************************************************************************/
const testingrooms = {}

io.on('connection', socket => {
  console.log('Connection occured from', socket.id)

  socket.on('JOIN_TEACHER', data => {
    const testingroomID = data.testingroomID
    const teacherID = data.teacherID
    console.log('Teacher', teacherID, 'has joined the testingroom!', testingroomID)

    // Insert the teacher in the testingroom
    if (!testingrooms[testingroomID]) {
      console.log('Create the testingroom', testingroomID)
      testingrooms[testingroomID] = {}
    }

    if (testingrooms[testingroomID].teacher) {
      console.log('Teacher', testingrooms[testingroomID].teacher,
        'is already in the testingroom', testingroomID)
      console.log('FULL_TEACHER', testingroomID)
      socket.emit('FULL_TEACHER', testingroomID)
      return
    }
    testingrooms[testingroomID].teacher = {
      socketID: socket.id,
      teacherID: teacherID
    }

    // Get the teacher in ther testingroom
    console.log('GET_TEACHER', testingrooms[testingroomID].teacher)
    socket.emit('GET_TEACHER', testingrooms[testingroomID].teacher)

    // Get the students in the testingroom
    if (!testingrooms[testingroomID].students) {
      console.log('There are no students in testingroom', testingroomID)
      testingrooms[testingroomID].students = []
    } else {
      console.log('Students in the testringroom', testingroomID,
        ':', testingrooms[testingroomID].students)
      console.log('GET_STUDENTS', testingrooms[testingroomID].students)
      socket.emit('GET_STUDENTS', testingrooms[testingroomID].students)
    }
  })

  socket.on('JOIN_STUDENT', data => {
    const testingroomID = data.testingroomID
    const studentID = data.studentID
    console.log('Student', studentID, 'has joined the testingroom!', testingroomID)

    // Insert the student in the testingroom
    if (!testingrooms[testingroomID]) {
      console.log('Create the testingroom', testingroomID)
      testingrooms[testingroomID] = {}
    }

    if (!testingrooms[testingroomID].students) {
      console.log('There are no students in testingroom', testingroomID)
      testingrooms[testingroomID].students = []
    }

    if (testingrooms[testingroomID].students.length >= 4) {
      console.log('Testingroom', testingroomID, 'is full of students',
        testingrooms[testingroomID].students)
      console.log('FULL_STUDENTS', testingroomID)
      socket.emit('FULL_STUDENTS', testingroomID)
      return
    }

    testingrooms[testingroomID].students.push({
      socketID: socket.id,
      studentID: studentID
    })

    // Get the students in the testingroom
    console.log('GET_STUDENTS', testingrooms[testingroomID].students)
    socket.emit('GET_STUDENTS', testingrooms[testingroomID].students)

    // Get the teacher in ther testingroom
    if (testingrooms[testingroomID].teacher) {
      console.log('GET_TEACHER', testingrooms[testingroomID].teacher)
      socket.emit('GET_TEACHER', testingrooms[testingroomID].teacher)
    }
  })
})

server.listen(process.env.PORT || 8800, () =>
  console.log('server is running on port 8800')
)
