"use client"
import { io } from 'socket.io-client'
import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';

export default function Home() {
  const socket = io("http://localhost:5000");
  const [id, setId] = useState("")
  const selfVideo = useRef(null);
  const callerVideo = useRef(null);
  const [stream, setStream] = useState()


  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const connectionRef = useRef();
  const [call, setCall] = useState({})
  const [name, setName] = useState("")
  const [idToCall, setIdToCall] = useState("")
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({video:true, audio:true})
    .then((currentStream) => {
      setStream(currentStream);
      selfVideo.current.srcObject = currentStream;
    })
    socket.on('me', (id) => {setId(id)})

    socket.on("callUser", (data) => {
      debugger;
      setCall({isReceivingCall:true, from:data.from, name:data.name,signal:data.signal})
    })
  }, [])

  const callUser = (idToCall) => {
    const peer = new Peer({initiator:true, trickle:false, stream});

    peer.on('signal', (data) => {
      socket.emit("callUser", {userToCall:idToCall, signalData:data, from:id})
    })

    peer.on('stream', (currentStream) => {
       callerVideo.current.srcObject = currentStream;
    })

    socket.on("callAccepted", (signal) => {
       setCallAccepted(true);
       peer.signal(signal);
    })

    connectionRef.current = peer;
  }



  return (
    <div>
      Merhaba, {id}
      <br/>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)}/>
      <br/>
      <input type="text" value={idToCall} onChange={(e) => setIdToCall(e.target.value)} />
      <button onClick={() => {
        socket.emit("callUser",{signal:null, from:id, name:name,to:idToCall})
      }}>ARA</button>
      <br/>
      { call.isReceivingCall && <h3>{call.name} sizi arıyor...</h3> }
      <br/>
      <video playsInline autoPlay ref={selfVideo}></video>
      { (callAccepted && !callEnded)  && <video  playsInline autoPlay ref={callerVideo}></video> }
    </div>
  )
}

// npm install peerjs socket.io-client 
// npm install simple-peer