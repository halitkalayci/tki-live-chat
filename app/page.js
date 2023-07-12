"use client"
import { io } from 'socket.io-client'
import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';

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
      console.log(data);
      setCall({isReceivingCall:true, from:data.from, name:data.name,signal:data.signal})
    })
  }, [])

  const answerCall = () => {
    setCallAccepted(true);
    // Stream datasını transfer edebilmek adına Peer oluşturuyoruz.
    // initiator:false => çünkü burda cevaplayan biziz yani peer'ın kurucusu biz değiliz.
    // stream => kullanıcının görüntü ve sesi
    const peer = new Peer({initiator:false, trickle:false, stream});

    // katıldığımız bu peer'da her sinyal alındığında çalışacak fonksiyonu belirliyoruz.
    peer.on("signal", (data) => {
      socket.emit("answerCall", {signal:data, to:call.from})
    })

    // katıldığımız bu peer'da her sinyal alındığında çalışacak fonksiyonu belirliyoruz.
    peer.on("stream",(currentStream) => {
      callerVideo.current.srcObject=currentStream;
    });

    // answer yaptığımız için. Yaptığımız aramanın signal alanını çalıştırıyoruz.
    peer.signal(call.signal);

    // Bu peer instance'ini bir public değere atamak.
    connectionRef.current = peer;
  }

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
    window.location.reload() //=> javascriptte sayfayı reload edecek fonksiyon
  }

  const callUser = (idToCall) => {
    const peer = new Peer({initiator:true, trickle:false, stream});
    //socket.emit("callUser", {to:idToCall, userToCall:idToCall, signalData:null, from:id,name:name})

    peer.on('signal', (data) => {
      socket.emit("callUser", {to:idToCall, userToCall:idToCall, signalData:data, from:id})
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
      <button onClick={() => {callUser(idToCall)}}>ARA</button>
      <br/>
      { call.isReceivingCall && <><h3>{call.name} sizi arıyor...</h3> <button onClick={answerCall}>Cevapla</button></> }
      <br/>
      <video playsInline autoPlay ref={selfVideo}></video>
      { callAccepted  && <video  playsInline autoPlay ref={callerVideo}></video> }
    </div>
  )
}

// npm install peerjs socket.io-client 
// npm install simple-peer