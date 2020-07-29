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
const socketToRoom = {}

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
      // change socket id into new one
      console.log('Teacher', testingrooms[testingroomID].teacher,
        'is already in the testingroom', testingroomID)
      console.log('SocketID changed to', socket.id)

      testingrooms[testingroomID].teacher.socketID = socket.id

      console.log('FULL_TEACHER', testingroomID)
      socket.emit('FULL_TEACHER', testingroomID)
    } else {
      testingrooms[testingroomID].teacher = {
        socketID: socket.id,
        teacherID: teacherID
      }
      socketToRoom[socket.id] = testingroomID
    }

    // Get the teacher in ther testingroom
    console.log('GET_TEACHER', testingrooms[testingroomID].teacher)
    socket.to(testingroomID).emit('GET_TEACHER', testingrooms[testingroomID].teacher)

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
    console.log('Student has joined the testingroom!', data)

    // Insert the student in the testingroom
    if (!testingrooms[testingroomID]) {
      console.log('Create the testingroom', testingroomID)
      testingrooms[testingroomID] = {}
    }

    if (!testingrooms[testingroomID].students) {
      console.log('There are no students in testingroom', testingroomID)
      testingrooms[testingroomID].students = []
    }
    // Check if UUID is duplicated, then change existing one
    const oldStudent = testingrooms[testingroomID].students.find(e => e.studentID === studentID)
    if (oldStudent) {
      console.log('Already joined student here', oldStudent)
      delete socketToRoom[oldStudent.socketID]
      const studentsInThisRoom = testingrooms[testingroomID].students.filter(e => e.studentID !== studentID)
      testingrooms[testingroomID].students = studentsInThisRoom
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

    console.log('Students', testingrooms[testingroomID])
    socketToRoom[socket.id] = testingroomID
    socket.join(testingroomID)

    // Get the students in the testingroom
    // Get the teacher in ther testingroom
    if (testingrooms[testingroomID].teacher) {
      console.log('GET_STUDENTS', testingrooms[testingroomID].students)
      socket.to(testingrooms[testingroomID].teacher.socketID).emit('GET_STUDENTS', testingrooms[testingroomID].students)
      console.log('GET_TEACHER', testingrooms[testingroomID].teacher)
      socket.emit('GET_TEACHER', testingrooms[testingroomID].teacher)
    }
  })

  socket.on('sending signal', payload => {
    console.log('sending signal', 'Caller ID is ', payload.callerID)
    io.to(payload.userToSignal).emit('RECEIVE_SIGNAL', {
      signal: payload.signal,
      callerID: payload.callerID,
      studentID: payload.uuid
    })
  })

  socket.on('returning signal', payload => {
    console.log('returning signal', payload.callerID)
    io.to(payload.callerID).emit('RECEIVE_RETURNED_SIGNAL', {
      signal: payload.signal,
      id: socket.id
    })
  })

  socket.on('disconnect', () => {
    console.log('disconnect')
    const testingroomID = socketToRoom[socket.id]
    // Delete socket id from table
    // Check whether this id is teacher or is student
    if (testingrooms[testingroomID] && testingrooms[testingroomID].teacher &&
       testingrooms[testingroomID].teacher.socketID === socket.id) {
      console.log('TEACHER_DISCONNCETED')
      delete socketToRoom[socket.id]
      delete testingrooms[testingroomID].teacher
      socket.emit('GET_TEACHER', [])
      console.log('GET_TEACHERS', [])
      // Teacher disconnect
      // Announce test end
    }
    if (testingrooms[testingroomID] && testingrooms[testingroomID].students) {
      // Announce teacher that this student is disconnected
      let students = testingrooms[testingroomID].students
      if (students) {
        delete socketToRoom[socket.id]

        students = students.filter(id => id.socketID !== socket.id)
        testingrooms[testingroomID].students = students
        console.log('GET_STUDENTS', testingrooms[testingroomID].students)
        testingrooms[testingroomID].teacher &&
          socket.to(testingrooms[testingroomID].teacher.socketID).emit('GET_STUDENTS', testingrooms[testingroomID].students)
      }
    }
  })
})

server.listen(process.env.PORT || 8800, () =>
  console.log('server is running on port 8800')
)
