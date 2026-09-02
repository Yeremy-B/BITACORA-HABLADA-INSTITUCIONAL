import { state, setStatus } from './state.js';
import { el } from './dom.js';

// ==========================================================================
// DICTADO POR VOZ (SPEECH RECOGNITION)
// ==========================================================================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

export function initSpeechRecognition(onTranscriptUpdate) {
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      state.recognizing = true;
      if (el.dictateBtn) {
        el.dictateBtn.classList.add('active');
        el.dictateBtn.textContent = '⏹ Detener dictado';
      }
      setStatus('🎙️ Escuchando... Habla con claridad');
    };

    recognition.onresult = (e) => {
      let finalTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        }
      }
      if (finalTranscript && onTranscriptUpdate) {
        onTranscriptUpdate(finalTranscript);
      }
    };

    recognition.onerror = (e) => {
      setStatus(`Error de dictado: ${e.error}`, true);
      stopDictation();
    };

    recognition.onend = () => {
      stopDictation();
    };
  }

  if (el.dictateBtn) {
    el.dictateBtn.addEventListener('click', toggleDictation);
  }
}

export function toggleDictation() {
  if (!recognition) {
    setStatus('El dictado por voz no es compatible con este navegador.', true);
    return;
  }
  if (state.recognizing) {
    recognition.stop();
  } else {
    try {
      recognition.start();
    } catch (e) {
      recognition.stop();
    }
  }
}

export function stopDictation() {
  state.recognizing = false;
  if (el.dictateBtn) {
    el.dictateBtn.classList.remove('active');
    el.dictateBtn.textContent = '🎙️ Dictar';
  }
}

// ==========================================================================
// SÍNTESIS DE VOZ (TEXT-TO-SPEECH)
// ==========================================================================
const synth = window.speechSynthesis;

export function loadVoices() {
  if (!synth || !el.voiceSelect) return;
  const all = synth.getVoices();
  state.allVoices = all;
  state.voices = all.filter(v => v.lang.startsWith('es') || v.lang.startsWith('ES'));
  if (state.voices.length === 0) state.voices = all;

  el.voiceSelect.innerHTML = '';
  state.voices.forEach((v, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `${v.name} (${v.lang})`;
    el.voiceSelect.appendChild(opt);
  });
}

export function speakText(textToRead) {
  if (!synth) {
    setStatus('Síntesis de voz no disponible.', true);
    return;
  }
  if (synth.speaking) synth.cancel();

  const text = textToRead || (el.editor ? el.editor.value.trim() : '');
  if (!text) {
    setStatus('No hay texto para leer.', true);
    return;
  }

  const utter = new SpeechSynthesisUtterance(text);
  const selectedIdx = el.voiceSelect ? parseInt(el.voiceSelect.value, 10) : 0;
  if (state.voices[selectedIdx]) {
    utter.voice = state.voices[selectedIdx];
  }
  utter.rate = 1.0;

  utter.onstart = () => {
    state.speaking = true;
    if (el.playBtn) el.playBtn.disabled = true;
    if (el.stopBtn) el.stopBtn.disabled = false;
    if (el.waveform) el.waveform.classList.add('active');
    setStatus('🔊 Leyendo en voz alta...');
  };

  utter.onend = () => {
    stopSpeaking();
  };

  utter.onerror = () => {
    stopSpeaking();
  };

  synth.speak(utter);
}

export function stopSpeaking() {
  if (synth) synth.cancel();
  state.speaking = false;
  if (el.playBtn) el.playBtn.disabled = false;
  if (el.stopBtn) el.stopBtn.disabled = true;
  if (el.waveform) el.waveform.classList.remove('active');
}

export function initSpeechSynthesis() {
  if (synth) {
    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  }

  if (el.playBtn) el.playBtn.addEventListener('click', () => speakText());
  if (el.stopBtn) el.stopBtn.addEventListener('click', stopSpeaking);
  if (el.previewVoiceBtn) {
    el.previewVoiceBtn.addEventListener('click', () => speakText('BH Enterprise. Sistema de gestión documental y voz.'));
  }
}
