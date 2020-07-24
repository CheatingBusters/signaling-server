require('dotenv').config()
const express = require('express')
const http = require('http')
const app = express()
const server = http.createServer(app)
const socket = require('socket.io')
const io = socket(server, { origins: '*:*' })

const students = {}
const teachers = {}
const users = {}

const socketToRoom = {}

io.on('connection', socket => {
  console.log('connection occured')
  socket.on('JOIN_TEACHER', data => {
    const roomID = data.testingroom_id
    const teacherID = data.teacher_id

    console.log('Teacher', teacherID, 'has joined the room!', roomID)

    const user = {
      socket_id: socket.id,
      uuid: teacherID
    }
    console.log('This teacher is:', user)

    if (users[roomID]) {
      const length = users[roomID].length
      if (length === 4) {
        console.log('room full')
        socket.emit('room full') // but this is unexpected emit...
        return
      }
    } else {
      users[roomID] = []
    }
    users[roomID].push(user)

    if (!teachers[roomID]) {
      teachers[roomID] = []
    }
    teachers[roomID].push(user)

    socketToRoom[socket.id] = roomID
    console.log(users[roomID], roomID, socket.id)
    const usersInThisRoom = users[roomID].filter(id => {
      return id.socket_id !== socket.id
    })
    console.log('users in this room except him/herself:', usersInThisRoom)
    socket.emit('GET_STUDENTS', usersInThisRoom)
  })
  // testee has joined the room
  // only make p2p connection with testers
  socket.on('JOIN_STUDENT', data => {
    const roomID = data.testingroom_id
    const studentID = data.student_id

    console.log('Student id [' + studentID + '] has joined the room!' + roomID)
    const user = {
      socket_id: socket.id,
      uuid: studentID
    }
    if (users[roomID]) {
      const length = users[roomID].length
      if (length === 4) {
        console.log('room full')
        socket.emit('room full')
        return
      }
    } else {
      users[roomID] = []
    }
    users[roomID].push(user)

    if (!students[roomID]) {
      students[roomID] = []
    }
    students[roomID].push(user)

    console.log(users[roomID])
    console.log('joined user socket id is ', socket.id)

    socketToRoom[socket.id] = roomID

    const teachersInThisRoom = teachers[roomID].filter(id => {
      return id.socket_id !== socket.id
    })
    socket.emit('GET_TEACHERS', teachersInThisRoom)
  })

  socket.on('sending signal', payload => {
    // I thinkk reach here when both teacher/student try to join?
    // Check this is from tester / testee and change msg according to it
    /*
    if(payload.isStudent){
      emit('ADD_TEACHER')
    }else{
      emit('ADD_STUDENT')
    }
    */
    io.to(payload.userToSignal).emit('user joined', {
      signal: payload.signal,
      callerID: payload.callerID,
      testee_id: payload.uuid,
      testee_socket_id: payload.callerID
    })
  })

  socket.on('returning signal', payload => {
    io.to(payload.callerID).emit('receiving returned signal', {
      signal: payload.signal,
      id: socket.id
    })
  })

  socket.on('disconnect', () => {
    const roomID = socketToRoom[socket.id]
    let room = users[roomID]
    if (room) {
      room = room.filter(id => id !== socket.id)
      users[roomID] = room
    }
    // send other peers that it is disconnected!
  })
})

server.listen(process.env.PORT || 8800, () =>
  console.log('server is running on port 8800')
)
