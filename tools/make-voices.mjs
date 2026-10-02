// Generates the game's voice-acted lines with ElevenLabs and writes them to www/audio/voice/.
// Usage: ELEVENLABS_API_KEY=... node tools/make-voices.mjs   (add --force to remake existing files)
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('Set ELEVENLABS_API_KEY first.'); process.exit(1); }
const FORCE = process.argv.includes('--force');
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'www', 'audio', 'voice');
const MODEL = 'eleven_v3';

// Voices: Marcus (tapes, calls), the Skin-Stealer (lures, radio), whispers.
const VOICES = {
  en: { marcus: 'CwhRBWXzGAHq8TQ4Fs17', skin: 'N2lVS1w4EtoT3dr4eOWO', whisper: '7u8v0eBQ4vDWz3brQwN4' },
  pt: { marcus: 'hetAnQsiAFr5QM0HWVes', skin: 'OwBaLJ97woZsXyQdLSeA', whisper: '7u8v0eBQ4vDWz3brQwN4' },
};

// Keep these texts in sync with TAPES, LURES, RADIOV, WHISPERS, MARCUS and MARCUS_FOUND in www/index.html.
const LINES = {
  en: {
    tape: ['Tape one. My name is Marcus. I do not know what day it is. The lights never turn off. I counted the rooms. Four thousand and twelve. Then I found my own tally marks on the wall.',
      'Tape two. There is water here, and people. Or there were. Someone left a note that says: do not stand in the dark. I did not understand it until I saw the teeth.',
      'Tape three. It is so hot. I heard my sister calling me from the pipes. My sister died nine years ago. I did not follow the voice. Do not follow the voice.',
      'Tape four. Everything here hums. The wires talk, if you listen long enough. They told me there is a way out at the very end, past the red door, past the daylight. They said: find all my tapes, and you will find me.',
      'Tape five. The pools are beautiful. Nothing hurts you here. I could stay. I think that is the trap. The longer you stay, the less you want to leave.',
      'Tape six. Balloons. Cake. Everyone is smiling. They said, hello friend, come to the party. If you hear this, do not go to the party. Find the keycard. Run.',
      'Tape seven. I cannot see anything anymore. My batteries are dead. Something keeps telling me it found the exit. It sounds just like me now. If you hear me calling you... it is not me.',
      'Tape eight. The water goes on forever. Something huge moves under it, and it sings. I am so tired. I am going to the room behind the daylight. If you have all eight tapes, come find me. Please. It is really me this time.'],
    lure: ['Hey! Over here! I found the exit!', 'Help me! Please, I am stuck!', 'It is okay. It is safe this way.', 'Wait for me! Do not leave me here!', 'Is someone there? Come closer, I cannot see.'],
    radio: ['Is anyone out there?', 'Come find me.', 'I can hear you breathing.'],
    whisper: ['turn around', 'it sees you', 'stay with us', 'behind you', 'you were never here'],
    marcus: ['Hello? Is someone there?', 'Over here. Please, follow my voice.', 'It is really me this time. I promise.', 'I can hear your footsteps. Keep going.'],
    marcusFound: 'You found me. You actually found me. I thought I would be here forever. Come on. Let us go home.',
  },
  pt: {
    tape: ['Fita um. Meu nome é Marcus. Não sei que dia é hoje. As luzes nunca se apagam. Contei as salas. Quatro mil e doze. Depois encontrei minhas próprias marcas de contagem na parede.',
      'Fita dois. Tem água aqui, e pessoas. Ou tinha. Alguém deixou um bilhete que diz: não fique no escuro. Eu não entendi até ver os dentes.',
      'Fita três. Está tão quente. Ouvi minha irmã me chamando dos canos. Minha irmã morreu há nove anos. Eu não segui a voz. Não siga a voz.',
      'Fita quatro. Tudo aqui zumbe. Os fios falam, se você escutar por tempo suficiente. Eles me disseram que existe uma saída bem no final, depois da porta vermelha, depois da luz do dia. Eles disseram: encontre todas as minhas fitas, e você vai me encontrar.',
      'Fita cinco. As piscinas são lindas. Nada machuca você aqui. Eu poderia ficar. Acho que essa é a armadilha. Quanto mais você fica, menos quer ir embora.',
      'Fita seis. Balões. Bolo. Todo mundo sorrindo. Eles disseram: olá, amigo, venha para a festa. Se você ouvir isso, não vá para a festa. Encontre o cartão. Corra.',
      'Fita sete. Não consigo ver mais nada. Minhas pilhas acabaram. Algo fica me dizendo que encontrou a saída. Agora soa igualzinho a mim. Se você me ouvir chamando... não sou eu.',
      'Fita oito. A água não acaba nunca. Algo enorme se move debaixo dela, e canta. Estou tão cansado. Vou para a sala atrás da luz do dia. Se você tiver as oito fitas, venha me encontrar. Por favor. Desta vez sou eu de verdade.'],
    lure: ['Ei! Aqui! Achei a saída!', 'Me ajuda! Por favor, estou preso!', 'Está tudo bem. Por aqui é seguro.', 'Espera por mim! Não me deixa aqui!', 'Tem alguém aí? Chega mais perto, eu não consigo ver.'],
    radio: ['Tem alguém aí?', 'Venha me encontrar.', 'Eu consigo ouvir você respirando.'],
    whisper: ['vire-se', 'ele vê você', 'fique com a gente', 'atrás de você', 'você nunca esteve aqui'],
    marcus: ['Olá? Tem alguém aí?', 'Aqui. Por favor, siga a minha voz.', 'Desta vez sou eu de verdade. Eu prometo.', 'Consigo ouvir seus passos. Continue.'],
    marcusFound: 'Você me encontrou. Você me encontrou mesmo. Achei que ficaria aqui para sempre. Vamos. Vamos para casa.',
  },
};

// Performance directions for eleven_v3, per kind of line.
const DIRECTION = { tape: '[tired, quiet, scared]', lure: '[friendly, calling out]', radio: '[distant, through static]', whisper: '[whispering]', marcus: '[exhausted, hopeful]', marcusFound: '[emotional, relieved]' };
const VOICE_FOR = { tape: 'marcus', lure: 'skin', radio: 'skin', whisper: 'whisper', marcus: 'marcus', marcusFound: 'marcus' };

function jobs(lang) {
  const out = [];
  for (const [kind, val] of Object.entries(LINES[lang])) {
    const list = Array.isArray(val) ? val : [val];
    list.forEach((text, i) => out.push({ id: Array.isArray(val) ? kind + (i + 1) : kind, kind, text }));
  }
  return out;
}

async function tts(voiceId, text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

const manifest = {};
for (const lang of Object.keys(LINES)) {
  fs.mkdirSync(path.join(OUT, lang), { recursive: true });
  manifest[lang] = [];
  for (const job of jobs(lang)) {
    const file = path.join(OUT, lang, job.id + '.mp3');
    if (!FORCE && fs.existsSync(file)) { manifest[lang].push(job.id); continue; }
    try {
      const audio = await tts(VOICES[lang][VOICE_FOR[job.kind]], `${DIRECTION[job.kind]} ${job.text}`);
      fs.writeFileSync(file, audio);
      manifest[lang].push(job.id);
      console.log('made', lang, job.id);
    } catch (e) {
      console.error('failed', lang, job.id, e.message);
    }
  }
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest));
console.log('done:', Object.entries(manifest).map(([l, ids]) => `${l} ${ids.length}`).join(', '));
