"use client"
import { io } from 'socket.io-client'
import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import './globals.css'
import { faPenNib, faPhoneSlash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// React'ın function'ı tekrar tekrar çağırarak state vs değiştirme durumunda 
// socketin tekrar tanımlanmasını engellemek adına function dışında tanımlanır.
const socket = io("http://localhost:5000"); // socketio
export default function Home() {
  // Ekran Paylaşımı
  const [id, setId] = useState("")
  const selfVideo = useRef(null);
  const callerVideo = useRef(null);
  const [stream, setStream] = useState()
  const audioPlayer = useRef(null);

  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const connectionRef = useRef();
  const [call, setCall] = useState({})
  const [name, setName] = useState("")
  const [idToCall, setIdToCall] = useState("")
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        selfVideo.current.srcObject = currentStream;
      })
    socket.on('me', (id) => { setId(id) })

    socket.on("callUser", (data) => {
      console.log(data);
      setCall({ isReceivingCall: true, from: data.from, name: data.name, signal: data.signal })
    })
  }, [])

  useEffect(() => {
    if (call.isReceivingCall) {
      audioPlayer.current.load();
      audioPlayer.current.play();
    }
  }, [call])

  const answerCall = () => {
    setCallAccepted(true);
    audioPlayer.current.pause();
    // Stream datasını transfer edebilmek adına Peer oluşturuyoruz.
    // initiator:false => çünkü burda cevaplayan biziz yani peer'ın kurucusu biz değiliz.
    // stream => kullanıcının görüntü ve sesi
    const peer = new Peer({ initiator: false, trickle: false, stream });

    // katıldığımız bu peer'da her sinyal alındığında çalışacak fonksiyonu belirliyoruz.
    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: call.from })
    })

    // katıldığımız bu peer'da her sinyal alındığında çalışacak fonksiyonu belirliyoruz.
    peer.on("stream", (currentStream) => {
      callerVideo.current.srcObject = currentStream;
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
    const peer = new Peer({ initiator: true, trickle: false, stream });
    //socket.emit("callUser", {to:idToCall, userToCall:idToCall, signalData:null, from:id,name:name})

    peer.on('signal', (data) => {
      socket.emit("callUser", { to: idToCall, userToCall: idToCall, signalData: data, from: id, name: name })
    })

    peer.on('stream', (currentStream) => {
      callerVideo.current.srcObject = currentStream;
    })

    socket.on("callAccepted", (data) => {
      setCallAccepted(true);
      peer.signal(data.signal);
    })

    connectionRef.current = peer;
  }



  return (
    <div className='container mt-5'>
      <div className='row w-100'>
        <div className='col-6'>
        <h3>Halit</h3>
        <video muted playsInline autoPlay ref={selfVideo}></video>
        </div>
        <div className='col-6'>
          <h3>Enes</h3>
        {!callAccepted && <video playsInline autoPlay ref={selfVideo}></video>}
        </div>
          <div className='col-6 mt-5'>
            <div className='row'>
            <div className='form-group col-3'>
              <label>Name</label>
              <input className='form-control' type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className='form-group col-3'>
              <label>Aranacak Kişi</label>
            <input className='form-control' type="text" value={idToCall} onChange={(e) => setIdToCall(e.target.value)} />
            </div>
            <div className='form-group col-3'>
               <button className='btn btn-primary mt-4 w-100' onClick={() => { callUser(idToCall) }}>ARA</button>
            </div>
            </div>
        {call.isReceivingCall && <><h3>{call.name} sizi arıyor...</h3> <button onClick={answerCall}>Cevapla</button></>}
        <audio ref={audioPlayer} className='d-none' controls src='ringtone.mp3'></audio>
          </div>
          <div className='col-6 mt-5 button-list'>
        <button onClick={leaveCall}>
        <FontAwesomeIcon icon={faPhoneSlash}  />
        </button>
        <button>Ekran Paylaş</button>
        <button>Mute</button>
        <button>Kamera Kapat</button>
          </div>
        
        </div>
      </div>
  )
}

// npm install peerjs socket.io-client 
// npm install simple-peer