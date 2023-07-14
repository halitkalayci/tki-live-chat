"use client"
import { io } from 'socket.io-client'
import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import './globals.css'
import { faArrowUpFromBracket, faMicrophone, faMicrophoneSlash, faPenNib, faPhoneSlash, faPhoneVolume, faVideo, faVideoSlash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// React'ın function'ı tekrar tekrar çağırarak state vs değiştirme durumunda 
// socketin tekrar tanımlanmasını engellemek adına function dışında tanımlanır.
const socket = io("http://localhost:5000"); // socketio
export default function Home() {
  // Ekran Paylaşımı
  const [userPeer, setUserPeer] = useState()
  const [id, setId] = useState("")
  const selfVideo = useRef(null);
  const callerVideo = useRef(null);
  const [stream, setStream] = useState()
  const audioPlayer = useRef(null);

  const [muted, setMuted] = useState(false);
  const [cameraClosed, setCameraClosed] = useState(false)
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const connectionRef = useRef();
  const [call, setCall] = useState({})
  const [name, setName] = useState("")
  const [idToCall, setIdToCall] = useState("")
  const [analyser, setAnalyser] = useState()
  const [dataArray, setDataArray] = useState([])
  const [isTalking, setIsTalking] = useState(false)
  // const [count, setCount] = useState(0)
  useEffect(() => {
    // setCount(count+1);

    // setCount((prevState) => {
    //     return prevState+1;
    // })

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        selfVideo.current.srcObject = currentStream;

        let audioContext = new AudioContext();

        let analyser = audioContext.createAnalyser();

        analyser.fftSize = 2048;
        let bufferLength = analyser.frequencyBinCount;
        setDataArray(new Uint8Array(bufferLength));

        let source = audioContext.createMediaStreamSource(currentStream);
        source.connect(analyser);

        setAnalyser(analyser);
      })
    socket.on('me', (id) => { setId(id); console.log(id); })

    socket.on("callUser", (data) => {
      setCall({ isReceivingCall: true, from: data.from, name: data.name, signal: data.signal })
    })

  }, [])

  useEffect(() => {
    if (call.isReceivingCall) {
      audioPlayer.current.load();
      audioPlayer.current.play();
    }
  }, [call])

  useEffect(() => {
    checkCameraAndMicrophone();
   
  }, [stream])

  useEffect(() => {
    if (stream && analyser)
      handleAudioStream();
  },[stream,analyser])

  const handleAudioStream = () => {
    if (!stream) return;
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i]
    }
    let average = sum / dataArray.length;
    //console.log(average);
    if(average > 50){
      setIsTalking(true);
    }else{
      setIsTalking(false);
    }
    requestAnimationFrame(handleAudioStream)
  }

  const checkCameraAndMicrophone = () => {
    if (!stream) return;
    setMuted(!stream.getAudioTracks()[0].enabled);
    setCameraClosed(!stream.getVideoTracks()[0].enabled);
  }

  const answerCall = () => {
    setCallAccepted(true);
    audioPlayer.current.pause();
    // Stream datasını transfer edebilmek adına Peer oluşturuyoruz.
    // initiator:false => çünkü burda cevaplayan biziz yani peer'ın kurucusu biz değiliz.
    // stream => kullanıcının görüntü ve sesi
    const peer = new Peer({ initiator: false, trickle: false, stream });

    // katıldığımız bu peer'da her sinyal alındığında çalışacak fonksiyonu belirliyoruz.
    peer.on("signal", (data) => {
      debugger;
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
    setUserPeer(peer);
    console.log(userPeer);
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
    setUserPeer(peer);
    console.log(userPeer);
  }

  const toggleMute = (value) => {
    stream.getAudioTracks()[0].enabled = value;
    checkCameraAndMicrophone();
  }

  const toggleCamera = (value) => {
    stream.getVideoTracks()[0].enabled = value;
    checkCameraAndMicrophone();
  }

  const shareScreen = async () => {
    console.log(userPeer);
    let currentStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    console.log(currentStream);
    setStream(currentStream);
    selfVideo.current.srcObject = currentStream;

    userPeer.replaceTrack(stream.getVideoTracks()[0], currentStream.getVideoTracks()[0], stream);
    setStream((prevStream) => {
      prevStream.getVideoTracks().forEach(track => {
        track.stop();
        prevStream.removeTrack(track);
      });
      if(currentStream.getVideoTracks().length > 0)
        prevStream.addTrack(currentStream.getVideoTracks()[0]);
      return prevStream;
    })
  }

  return (
    <div className='container w-75 mt-5'>
      <div className='row w-100'>
        <div className='col-6'>
          <h3>Halit {id}</h3>
          <h3>{isTalking ? <p>Konuşuyor</p> : <p>Konuşmuyor</p>}</h3>
          <video muted playsInline autoPlay ref={selfVideo}></video>
        </div>
        <div className='col-6'>
          <h3>Enes</h3>
          {callAccepted && <video playsInline autoPlay ref={callerVideo}></video>}
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
              <button className='btn btn-primary mt-4 w-100' onClick={() => { callUser(idToCall) }}>
                <FontAwesomeIcon icon={faPhoneVolume} /> ARA
              </button>
            </div>
          </div>
          {call.isReceivingCall && <><h3>{call.name} sizi arıyor...</h3> <button onClick={answerCall}>Cevapla</button></>}
          <audio ref={audioPlayer} className='d-none' controls src='ringtone.mp3'></audio>
        </div>
        <div className='col-6 mt-5 button-list'>
          <button title='End Call' className='btn btn-outline-danger' onClick={leaveCall}>
            <FontAwesomeIcon icon={faPhoneSlash} />
          </button>
          <button onClick={shareScreen} title='Share Screen' className='btn btn-outline-primary'>
            <FontAwesomeIcon icon={faArrowUpFromBracket} />
          </button>

          {
            muted == true ? <button onClick={() => toggleMute(true)} title="Mute" className='btn btn-outline-secondary'>
              <FontAwesomeIcon icon={faMicrophoneSlash} />
            </button> : <button onClick={() => toggleMute(false)} title="Mute" className='btn btn-outline-secondary'>
              <FontAwesomeIcon icon={faMicrophone} />
            </button>
          }
          {cameraClosed == true ? <button onClick={() => toggleCamera(true)} title="Turn On Camera" className='btn btn-outline-warning'>
            <FontAwesomeIcon icon={faVideoSlash} />
          </button> : <button onClick={() => toggleCamera(false)} title="Turn Off Camera" className='btn btn-outline-warning'>
            <FontAwesomeIcon icon={faVideo} />
          </button>}
        </div>

      </div>
    </div>
  )
}

// npm install peerjs socket.io-client 
// npm install simple-peer