// src/App.js
import React, { useEffect, useState } from 'react';
import Main from './components/main/Main';
import BigBangCanvas from './components/bigbang/BigBang';

function App() {
  // 🔥 sessionStorage 체크해서 BigBang을 보여줄지 결정
  const [showBigBang, setShowBigBang] = useState(() => {
    const hasPlayed = sessionStorage.getItem("hasPlayedBigBang");
    if (hasPlayed === "true") return false; // 이미 봤으면 스킵
    sessionStorage.setItem("hasPlayedBigBang", "true"); // 처음이면 기록
    return true;
  });

  useEffect(() => {
    if (!showBigBang) return; // 이미 본 경우 BigBang 타이머 실행 X

    // BigBangCanvas에서 사용하는 총 애니메이션 시간(ms)
    const totalDuration = 5000;

    const timer = setTimeout(() => {
      setShowBigBang(false); // 애니메이션 끝나면 Main 보여줌
    }, totalDuration);

    return () => clearTimeout(timer);
  }, [showBigBang]);

  return (
    <div className="App">
      {!showBigBang && <Main />}
      {showBigBang && <BigBangCanvas />}
    </div>
  );
}

export default App;
