require('dotenv').config()
const express = require('express')
const http = require('http')
const app = express()
const server = http.createServer(app)
const socket = require('socket.io')
const io = socket(server, { origins: '*:*' })

const testees = {}
const testers = {}
const users = {}

const socketToRoom = {}

io.on('connection', socket => {
  console.log('connection occured')
  socket.on('JOIN_OVERSEER', data => {
    const roomID = data.testingroom_id
    const overseerID = data.overseer_id

    console.log('Tester', overseerID, 'has joined the room!', roomID)

    const user = {
      socket_id: socket.id,
      uuid: overseerID
    }
    console.log('This tester is:', user)

    if (users[roomID]) {
      const length = users[roomID].length
      if (length === 4) {
        console.log('Tester room full')
        socket.emit('room full') // but this is unexpected emit...
        return
      }
    } else {
      users[roomID] = []
    }
    users[roomID].push(user)

    if (!testers[roomID]) {
      testers[roomID] = []
    }
    testers[roomID].push(user)

    socketToRoom[socket.id] = roomID
    console.log(users[roomID], roomID, socket.id)
    const usersInThisRoom = users[roomID].filter(id => {
      return id.socket_id !== socket.id
    })
    console.log('users in this room except him/herself:', usersInThisRoom)
    socket.emit('GET_TESTEES', usersInThisRoom)
  })
  // testee has joined the room
  // only make p2p connection with testers
  socket.on('JOIN_TESTEE', data => {
    const value = JSON.parse(data)
    const roomID = value.testingroom_id
    const testeeID = value.testee_id

    console.log('User id [' + testeeID + '] has joined the room!' + roomID)

    if (users[roomID]) {
      const length = users[roomID].length
      if (length === 4) {
        console.log('Tester room full')
        socket.emit('room full')
        return
      }
    }
    users[roomID].socket_id.push(socket.id)
    users[roomID].uuid.push(testeeID)

    testees[roomID].socket_id.push(socket.id)
    testees[roomID].uuid.push(testeeID)

    console.log(users[roomID])
    console.log('joined user socket id is ', socket.id)

    socketToRoom[socket.id] = roomID

    const testersInThisRoom = testers[roomID].filter(id => {
      return id.socket_id !== socket.id
    })
    socket.emit('GET_TESTERS', testersInThisRoom)
  })

  socket.on('sending signal', payload => {
    // Check UUID
    io.to(payload.userToSignal).emit('ADD_TESTEE', {
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
  })
})

server.listen(process.env.PORT || 8800, () =>
  console.log('server is running on port 8800')
)
