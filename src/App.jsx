import { useEffect, useState } from "react"
import { io } from "socket.io-client"
import turdImg from "./assets/turd.png"
import spawnSound from "./assets/spawn.mp3"
import winnerSound from "./assets/winner.mp3"
import goldBannerImg from "./assets/banner.png"

// ==========================================
// SOCKET CONNECTION (UPGRADED FOR WEBSOCKET STABILITY)
// ==========================================


const socket = io("https://turd-backend-1ztr.onrender.com", {
 // Uses persistent websocket logic first, falling back to polling safely if blocked
 transports: ["websocket", "polling"]
})



function App() {
  const [bubbles, setBubbles] = useState([])
  const [turd, setTurd] = useState(null)
  const [winner, setWinner] = useState(null)

  // States to hold token data and the plaintext username string


  const [twitchAuth, setTwitchAuth] = useState(null)
  const [twitchUsername, setTwitchUsername] = useState("Anonymous Viewer")



  useEffect(() => {

    // ==========================================


    // TWITCH FRONTEND EXTENSION INITIALIZATION


    // ==========================================


    if (window.Twitch && window.Twitch.ext) {
      console.log("🛠️ DEBUG: Twitch Extension Helper detected successfully.")

      // 1. Initial configuration load handler

      window.Twitch.ext.onAuthorized(async (auth) => {


        console.group("🔒 TWITCH ON-AUTHORIZED PAYLOAD RECEIVED")
        console.log("• Client ID:", auth.clientId)
	console.log("• Opaque User ID (Raw):", auth.userId)
        console.log("• Helix JWT Token Exists?:", !!auth.helixToken)
        console.log("• User Privacy Link Status:", window.Twitch.ext.viewer.isLinked ? "✅ LINKED" : "❌ UNLINKED")
        console.groupEnd()
        setTwitchAuth(auth)



        // If authorized from a past session, parse username instantly using the numeric user ID


        if (window.Twitch.ext.viewer.isLinked && auth.helixToken) {
          console.log("🔄 Existing user link found. Fetching plain-text username...")
          fetchTwitchUsername(auth.helixToken, auth.clientId, window.Twitch.ext.viewer.id)
        }
      })



      // 2. Immediate event listener for when a user clicks "Authorize"


      window.Twitch.ext.viewer.onChanged(() => {
        console.group("📡 TWITCH VIEW CONTEXT CHANGED")
        console.log("• Current Link Status:", window.Twitch.ext.viewer.isLinked ? "✅ LINKED" : "❌ UNLINKED")
        console.log("• Global Viewer Object ID:", window.Twitch.ext.viewer.id)
        console.groupEnd()

        if (window.Twitch.ext.viewer.isLinked && window.Twitch.ext.auth) {
          console.log("🎯 SUCCESS: User clicked 'Authorize'. Upgrading token and executing database lookup...")
          fetchTwitchUsername(window.Twitch.ext.auth.helixToken, window.Twitch.ext.auth.clientId, window.Twitch.ext.viewer.id)
        }
      })

    } else {
      console.warn("⚠️ DEBUG ERROR: Twitch extension helper script was not detected.")
    }

    // ==========================================
    // INBOUND SOCKET LISTENERS
    // ==========================================


    socket.on("connect", () => {
      console.log(`🔌 SOCKET CONNECTED: Session established with transport ID [${socket.id}]`)
    })

    socket.on("turd", (data) => {
      console.log("💩 SOCKET INBOUND: Turd spawned at coordinates:", data)
      setTurd(data)
      if (data) {
        const audio = new Audio(spawnSound)
        audio.volume = 1
        audio.play().catch(() => console.log("🔊 Autoplay blocked by browser policy."))
      }
    })



    // CLICK BUBBLES


    socket.on("bubble", (data) => {
      const randomHue = Math.floor(Math.random() * 360);


      
      const newBubble = {
        ...data,
        id: Date.now() + Math.random(),
        color: `hsl(${randomHue}, 90%, 65%)` 
      };
      setBubbles((prev) => [...prev, newBubble]);
    });

    // WINNER POPUP


    socket.on("winner", (data) => {
      console.log(`🏆 SOCKET INBOUND: Winner declared! User [${data.user}] cleared the game.`);
      setWinner(data);

      const targetVolume = 0.60; 

      try {
        const audio = new Audio(winnerSound);
        audio.volume = targetVolume; 
        console.log(`🔊 Playing celebration track at optimized volume level: ${targetVolume * 100}%`);
        audio.play().catch(() => {
          console.log("🔊 Winner sound autoplay blocked by browser policy.");
        });
      } catch (err) {
        console.error("❌ Problem executing celebration audio thread:", err.message);
      }

      // Automatically clear the banner after 12 seconds

      setTimeout(() => {
        setWinner(null);
      }, 12000); 
    });

    return () => {
      socket.off("connect")
      socket.off("turd")
      socket.off("bubble")
      socket.off("winner")
    }
  }, [])

  // ==========================================
  // 🔬 DEBUG STATE TRACKER (TRANSITION LOGGER)
  // ==========================================


  useEffect(() => {
    if (turd === null) {
      console.log(
        "%c🙈 FRONTEND STATE ALERT: Game is currently NULL (Hidden/Cooldown Mode). Controls locked.", 
        "background: #222; color: #ffbc00; font-size: 13px; padding: 4px; border-radius: 4px;"
      );
    } else {
      console.log(
        `%c🎯 FRONTEND STATE ALERT: Game has switched OUT of null! Position -> X: ${turd.x}%, Y: ${turd.y}%. Controls unlocked!`, 
        "background: #117a3b; color: #fff; font-size: 13px; padding: 4px; border-radius: 4px;"
      );
    }
  }, [turd]);

  // ==========================================
  // DIRECT BROWSER TWITCH API LOOKUP
  // ==========================================


  const fetchTwitchUsername = async (helixToken, clientId, numericUserId) => {


    try {
      const url = `https://api.twitch.tv/helix/users?id=${numericUserId}`
      console.log(`🌐 Sending fetch request to Twitch Helix API for ID [${numericUserId}]...`)


      


      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Client-ID": clientId,
          "Authorization": `Extension ${helixToken}`
        }
      })

      const data = await response.json()
      console.log("📥 Raw Helix API JSON Response Received:", data)

      if (data && data.data && data.data[0]) {
        const realName = data.data[0].display_name
        console.log(`✨ SUCCESS: Unencrypted username resolved -> "${realName}"`)
        setTwitchUsername(realName)
      } else {
        console.error("⚠️ Helix data structure returned empty or malformed.")
      }
    } catch (err) {
      console.error("❌ CRITICAL: Helix user fetch failed completely:", err)
    }
  }



  // ==========================================
  // INTERACTION CLICK HANDLER
  // ==========================================


  const handleClick = (e) => {
    if (!turd) return;
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100



    if (window.Twitch?.ext && !window.Twitch.ext.viewer.isLinked) {
      console.group("🛡️ EMISSION BLOCKED: IDENTITY UNLINKED")
      console.log("• Action taken: Opening Twitch authorization slider window.")
      console.groupEnd()


    
      window.Twitch.ext.actions.requestIdShare()
      return
    }



    const outboundPayload = {
      x: parseFloat(x.toFixed(1)),
      y: parseFloat(y.toFixed(1)),
      user: twitchUsername 
    }

    console.group("✈️ SOCKET OUTBOUND: TRANSMITTING DATA TO RENDER")
    console.log("• exact Object Data Sent:", outboundPayload)
    console.groupEnd()
    socket.emit("click", outboundPayload)
  }



  return (
    <div
      onClick={handleClick}
      style={{
        width: "100vw",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        overflow: "hidden",
        background: "transparent",


    

        // Dynamic system logic checks

        cursor: turd ? "crosshair" : "default",
        pointerEvents: turd ? "auto" : "none"
      }}
    >


      {/* CLICK BUBBLES */}


      {bubbles.map((b) => (
        <div
          key={b.id}
          onAnimationEnd={() => {
            setBubbles((prev) => prev.filter((bubble) => bubble.id !== b.id));


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