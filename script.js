const textarea = document.getElementById('entryInput');
const saveBtn = document.getElementById('saveBtn');
const myBookBtn = document.getElementById('myBookBtn');
const backToNewFromList = document.getElementById('backToNewFromList');
const backToListFromEntry = document.getElementById('backToListFromEntry');
const newEntryView = document.getElementById('newEntryView');
const listView = document.getElementById('listView');
const entryView = document.getElementById('entryView');


let entries = [];

function loadEntries() {
  const saved = localStorage.getItem('livebook_entries');
  if (saved) {
    entries = JSON.parse(saved);
  } else {
    entries = [];
  }
  renderEntriesList();
}

function saveEntries() {
  localStorage.setItem('livebook_entries', JSON.stringify(entries));
}

loadEntries();

textarea.addEventListener('input', () => {
    saveBtn.disabled = textarea.value.trim().length < 10;
});

function showView(viewId) {
    newEntryView.classList.remove('active');
    listView.classList.remove('active');
    entryView.classList.remove('active');
    document.getElementById(viewId).classList.add('active');
}

myBookBtn.addEventListener('click', () => showView('listView'));
backToNewFromList.addEventListener('click', () => showView('newEntryView'));
backToListFromEntry.addEventListener('click', () => showView('listView'));

saveBtn.addEventListener('click', async () => {
  const text = textarea.value.trim();
  if (text.length < 10) return;

  const originalTextBtn = saveBtn.innerText;
  saveBtn.innerText = 'Обрабатываю...';
  saveBtn.disabled = true;

  try {
    const beautiful = await beautifyText(text);
    const newEntry = {
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      originalText: text,
      beautifulText: beautiful
    };
    entries.unshift(newEntry);
    saveEntries();
    renderEntriesList();
    textarea.value = '';
    showView('listView');
  } catch (err) {
    console.error(err);
    alert('Не удалось обработать запись. Попробуй ещё раз.');
  } finally {
    saveBtn.innerText = originalTextBtn;
    saveBtn.disabled = textarea.value.trim().length < 10;
  }
});

function renderEntriesList() {
    const container = document.getElementById('entriesList');
    if (!entries.length) {
        container.innerHTML = '<p>Пока ни одной записи. Создай первую!</p>';
        return;
    }
    container.innerHTML = '';
    entries.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'entry-card';
        card.innerHTML = `
        <div class="entry-date">${entry.date}</div>
        <div class="entry-preview">${entry.beautifulText.slice(0, 50)}${entry.beautifulText.length > 50 ? '…' : ''}</div>
        <button class="delete-entry" data-id="${entry.id}">🗑️ Удалить</button>
        `;
        container.appendChild(card);
        card.setAttribute('data-id', entry.id);
    })
}

document.getElementById('entriesList').addEventListener('click', (e) => {
  const btn = e.target.closest('.delete-entry');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (confirm('Удалить запись навсегда?')) {
    entries = entries.filter(entry => entry.id !== id);
    saveEntries();
    renderEntriesList();
    if (entries.length === 0) showView('newEntryView');
  }
});

function openEntryById(id) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;

  const container = document.getElementById('entryContent');
  container.innerHTML = `
    <div class="real-book">
      <div class="book-sheet">
        <div class="book-page-inner">
          <div class="book-date">${entry.date}</div>
          <div class="book-text"></div>
          <div class="book-buttons">
            <button class="speak-button">Слушать вслух</button>
            <button class="stop-speak-button">Остановить чтение</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const textContainer = container.querySelector('.book-text');
  typeWriter(textContainer, entry.beautifulText, 40);

  const speakBtn = container.querySelector('.speak-button');
    if (speakBtn) {
    speakBtn.addEventListener('click', () => {
        speakText(entry.beautifulText);
    });
    const stopBtn = container.querySelector('.stop-speak-button');
        if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            window.speechSynthesis.cancel();
        });
        }  
    }

  showView('entryView');
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

document.getElementById('entriesList').addEventListener('click', (e) => {
  const card = e.target.closest('.entry-card');
  if (!card) return;
  if (e.target.classList.contains('delete-entry')) return;
  const id = Number(card.dataset.id);
  openEntryById(id);
});

function typeWriter(element, text, speed = 30) {
  let i = 0;
  element.innerHTML = '';
  function type() {
    if (i < text.length) {
      element.innerHTML += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }
  type();
}

function speakText(text) {
  async function speakText(text) {
  if (!text || text.length < 5) {
    alert('Текст слишком короткий для озвучивания');
    return;
  }

  try {
    const response = await fetch('https://livebook-app.onrender.com/api/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка озвучивания');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
 
    if (window.currentAudio) {
      window.currentAudio.pause();
      window.currentAudio = null;
    }

    const audio = new Audio(audioUrl);
    window.currentAudio = audio;
    audio.play();

  } catch (error) {
    console.error('Speech error:', error);
    alert('Не удалось озвучить текст. Попробуй ещё раз.');
  }
  }
}

async function beautifyText(text) {
  const response = await fetch('https://livebook-app.onrender.com/api/beautify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Ошибка сервера');
  }

  const data = await response.json();
  return data.beautiful;
}