import { useEffect, useState } from "react"
import { io } from "socket.io-client"
import turdImg from "./assets/turd.png"
import spawnSound from "./assets/spawn.mp3"
import winnerSound from "./assets/winner.mp3"
import goldBannerImg from "./assets/banner.png"

// ==========================================
// SOCKET CONNECTION (POINTS TO YOUR RENDER BACKEND)
// ==========================================
const socket = io("https://turd-backend-1ztr.onrender.com", {
  transports: ["websocket", "polling"]
})

function App() {
  const [bubbles, setBubbles] = useState([])
  const [turd, setTurd] = useState(null)
  const [winner, setWinner] = useState(null)

  useEffect(() => {
    // ==========================================
    // INBOUND SOCKET LISTENERS
    // ==========================================
    socket.on("connect", () => {
      console.log(`🔌 SOCKET CONNECTED: Session established with transport ID [${socket.id}]`)
    })

    // Listen for target spawning/cooldowns managed by Render
    socket.on("turd", (data) => {
      console.log("💩 SOCKET INBOUND: Turd data updated:", data)
      setTurd(data)
      if (data) {
        const audio = new Audio(spawnSound)
        audio.volume = 1
        audio.play().catch(() => console.log("🔊 Autoplay blocked by browser policy."))
      }
    })

    // Listen for any click forwarded by SAMMI to render the bubble animation
    socket.on("bubble", (data) => {
      const randomHue = Math.floor(Math.random() * 360)
      
      const newBubble = {
        ...data,
        id: Date.now() + Math.random(),
        color: `hsl(${randomHue}, 90%, 65%)` 
      }
      setBubbles((prev) => [...prev, newBubble])
    })

    // Listen for a win confirmation to show the banner
    socket.on("winner", (data) => {
      console.log(`🏆 SOCKET INBOUND: Winner declared! User [${data.user}] cleared the game.`)
      setWinner(data)

      const targetVolume = 0.60; 

      try {
        const audio = new Audio(winnerSound)
        audio.volume = targetVolume 
        console.log(`🔊 Playing celebration track at optimized volume level: ${targetVolume * 100}%`)
        audio.play().catch(() => {
          console.log("🔊 Winner sound autoplay blocked by browser policy.")
        })
      } catch (err) {
        console.error("❌ Problem executing celebration audio thread:", err.message)
      }

      // Automatically clear the banner after 12 seconds
      setTimeout(() => {
        setWinner(null)
      }, 12000) 
    })

    return () => {
      socket.off("connect")
      socket.off("turd")
      socket.off("bubble")
      socket.off("winner")
    }
  }, [])

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        overflow: "hidden",
        background: "transparent",
        // The overlay is strictly visual now, pointer-events are disabled 
        // so it never blocks elements behind it in OBS
        pointerEvents: "none" 
      }}
    >
      {/* CLICK BUBBLES */}
      {bubbles.map((b) => (
        <div
          key={b.id}
          onAnimationEnd={() => {
            setBubbles((prev) => prev.filter((bubble) => bubble.id !== b.id))
          }}
          style={{
            position: "absolute",
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            background: b.color || "rgba(255,255,255,0.5)", 
            border: "1px solid white",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            animation: "pop 0.6s ease-out forwards",
            boxShadow: `0 0 8px ${b.color}`
          }}
        />
      ))}

      {/* TURD IMAGE */}
      {turd && (
        <img
          src={turdImg}
          alt="turd"
          style={{
            position: "absolute",
            left: `${turd.x}%`,
            top: `${turd.y}%`,
            transform: "translate(-50%, -50%)",
            width: "18px",
            height: "18px",
            pointerEvents: "none",
            opacity: 0.9,
            userSelect: "none"
          }}
        />
      )}

      {/* WINNER POPUP */}
      {winner && (
        <div
          style={{
            position: "absolute",
            top: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundImage: `url(${goldBannerImg})`,
            backgroundSize: "100% 100%", 
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            minWidth: "320px", 
            height: "120px",
            paddingLeft: "100px",
            paddingRight: "100px",
            paddingBottom: "36px", 
            display: "inline-flex", 
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box", 
            color: "#4a3300", 
            fontSize: "24px",
            fontWeight: "bold",
            textShadow: "1px 1px 0px rgba(255,255,255,0.5)",
            pointerEvents: "none",
            whiteSpace: "nowrap"
          }}
        >
          {winner.user} found the turd!
        </div>
      )}
    </div>
  )
}

export default App
