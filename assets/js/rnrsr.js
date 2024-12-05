const localChecklist = document.getElementById("local_checklist");
const networkChecklist = document.getElementById("network_checklist");
const portsToTry = [
  80, 81, 88,
  3000, 3001, 3030, 3031, 3333,
  4000, 4001, 4040, 4041, 4444,
  5000, 5001, 5050, 5051, 5555,
  6000, 6001, 6060, 6061, 6666,
  7000, 7001, 7070, 7071, 7777,
  8000, 8001, 8080, 8081, 8888,
  9000, 9001, 9090, 9091, 9999,
];

function logLine(checklist, text, className) {
  const span = document.createElement("span");
  span.innerHTML = text + " ";
  span.setAttribute("class", "result" + " " + className);
  checklist.appendChild(span);
  checklist.scrollTop = checklist.scrollHeight;
}

function timeoutPromise(ms, promise) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("TIMEOUT"));
    }, ms);
    promise.then(
      res => {
        clearTimeout(timeoutId);
        resolve(res);
      },
      err => {
        clearTimeout(timeoutId);
        reject(err);
      }
    );
  })
}

function getLocalNetworkPrefix(cb) {
  var RTCPeerConnection = window.RTCPeerConnection || webkitRTCPeerConnection || mozRTCPeerConnection;
  var peerConn = new RTCPeerConnection({'iceServers': [{'urls': ['stun:stun.l.google.com:19302']}]});
  var dataChannel = peerConn.createDataChannel('test');  // Needs something added for some reason
  peerConn.createOffer({}).then((desc) => peerConn.setLocalDescription(desc));
  peerConn.onicecandidate = (e) => {
    if (e.candidate == null) {
      cb(/(192\.168\.[0-9]+\.)[0-9]+/.exec(peerConn.localDescription.sdp)[1]);
    }
  };
}

function scanHost(hostname, checklist, cb) {
  logLine(checklist, `Scanning ${hostname} ...`, "");
  function loop(portIndex) {
    if (portIndex >= portsToTry.length) {
      logLine(checklist, `${hostname} complete.`, "");
      cb();
    } else {
      const port = portsToTry[portIndex];
      const url = `http://${hostname}:${port}`;
      timeoutPromise(2000, fetch(url)).then(
        response => {
          logLine(checklist, `<a href="http://${hostname}:${port}" target="_blank">${hostname}:${port}</a> is available!`, "bad");
          loop(portIndex+1);
        },
        e => {
          if (e.message == "TIMEOUT") {
            // Assume this host is unreachable. Don't waste time; go to the next host.
            logLine(checklist, `unreachable.`, "");
            cb();
          } else {
            loop(portIndex+1);
          }
        }
      );
    }
  }
  loop(0);
}

function scanNetwork(localNetworkPrefix) {
  logLine(networkChecklist, "Scanning network ...", "");
  function loop(lowByte) {
    if (lowByte > 255) {
      logLine(networkChecklist, `Network scan complete.`, "");
    } else {
      const hostname = localNetworkPrefix + lowByte;
      scanHost(hostname, networkChecklist, () => {
        loop(lowByte+1);
      });
    }
  }
  loop(1);
}

function getIP() {
  timeoutPromise(2000, fetch('https://ipapi.co/json')).then(
    response => { response.json().then(
      data => { document.getElementById("ip").innerHTML=data.ip
        document.getElementById("loc").innerHTML=data.city
        document.getElementById("country").innerHTML=data.country_name
        document.getElementById("lat").innerHTML=data.latitude
        document.getElementById("long").innerHTML=data.longitude
        document.getElementById("isp").innerHTML=data.org
      }
    )},
    e => {
      console.log(e)
    }
  );
}

getIP();
scanHost("localhost", localChecklist, () => {
  getLocalNetworkPrefix(prefix => {
    scanNetwork(prefix);
  })
});