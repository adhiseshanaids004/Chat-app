const React = window.React;
const {useEffect, useState} = window.React;
const {createRoot} = window.ReactDOM;

function App() {
  const [view, setView] = useState('login');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [me, setMe] = useState(null);
  const [socket, setSocket] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      fetch('/me', {headers: {Authorization: 'Bearer ' + token}})
        .then(r => {
          if (!r.ok) return Promise.reject('HTTP ' + r.status);
          return r.json();
        })
        .then(d => {
          if (d.error) return Promise.reject(d.error);
          setMe(d);
          setView('chat');
          connectSocket(token);
        })
        .catch(e => {
          setError('Auth error: ' + e);
          localStorage.removeItem('token');
          setToken('');
        });
    }
  }, []);

  function connectSocket(t) {
    if (socket) socket.close();
    const wsAddr = window.location.origin.replace(/^http/, 'ws');
    const s = new WebSocket(wsAddr);
    
    s.onopen = () => {
      console.log('WebSocket connected');
      s.send(JSON.stringify({type: 'auth', token: t}));
    };
    
    s.onmessage = (e) => {
      const d = JSON.parse(e.data);
      console.log('Received:', d);
      if (d.type === 'contacts') setContacts(d.contacts);
      if (d.type === 'message') setMessages(m => [...m, d.message]);
    };
    
    s.onerror = (e) => {
      console.error('WebSocket error:', e);
      setError('WebSocket error');
    };
    
    s.onclose = () => {
      console.log('WebSocket closed');
    };
    
    setSocket(s);
  }

  async function signup(name, phone, password) {
    try {
      const r = await fetch('/auth/signup', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({name, phone, password})
      });
      const j = await r.json();
      if (j.token) {
        localStorage.setItem('token', j.token);
        setToken(j.token);
        setMe(j.user);
        setView('chat');
        connectSocket(j.token);
        setError('');
      } else {
        setError(j.error || 'Signup failed');
      }
    } catch (e) {
      setError('Signup error: ' + e.message);
    }
  }

  async function login(phone, password) {
    try {
      const r = await fetch('/auth/login', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({phone, password})
      });
      const j = await r.json();
      if (j.token) {
        localStorage.setItem('token', j.token);
        setToken(j.token);
        setMe(j.user);
        setView('chat');
        connectSocket(j.token);
        setError('');
      } else {
        setError(j.error || 'Login failed');
      }
    } catch (e) {
      setError('Login error: ' + e.message);
    }
  }

  function send() {
    if (!socket || !me || !text.trim()) return;
    const toId = selected ? selected.id : null;
    socket.send(JSON.stringify({
      type: 'message',
      from: me.id,
      to: toId,
      group: null,
      text: text
    }));
    setText('');
  }

  function logout() {
    localStorage.removeItem('token');
    setToken('');
    setMe(null);
    setView('login');
    setMessages([]);
    setContacts([]);
    if (socket) socket.close();
  }

  if (view === 'login') {
    return React.createElement(Login, {onSignup: signup, onLogin: login, error: error});
  }

  return React.createElement('div', {style: {padding: '20px', fontFamily: 'Arial'}},
    React.createElement('div', {style: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}},
      React.createElement('h2', null, 'Chat - ' + (me?.name || 'Loading...')),
      React.createElement('button', {onClick: logout, style: {padding: '8px 16px', cursor: 'pointer'}}, 'Logout')
    ),
    error && React.createElement('div', {style: {color: 'red', marginBottom: '10px'}}, error),
    React.createElement('div', {style: {display: 'flex', gap: '20px', height: '500px'}},
      React.createElement('div', {style: {width: '250px', border: '1px solid #ddd', padding: '10px', overflowY: 'auto'}},
        React.createElement('h4', null, 'Contacts'),
        contacts.length === 0 && React.createElement('p', {style: {color: '#999'}}, 'No contacts'),
        contacts.map(c =>
          React.createElement('div', {
            key: c.id,
            style: {
              padding: '10px',
              cursor: 'pointer',
              background: selected && selected.id === c.id ? '#cce5ff' : 'transparent',
              borderRadius: '4px',
              marginBottom: '5px',
              border: '1px solid #eee'
            },
            onClick: () => setSelected(c)
          },
            React.createElement('div', null, c.name || c.phone),
            React.createElement('span', {style: {fontSize: '12px', color: c.online ? 'green' : 'gray'}},
              c.online ? '● Online' : '● Offline'
            )
          )
        )
      ),
      React.createElement('div', {style: {flex: 1, display: 'flex', flexDirection: 'column'}},
        React.createElement('h4', null, selected ? 'Chat with ' + (selected.name || selected.phone) : 'Select a contact'),
        React.createElement('div', {
          style: {
            flex: 1,
            border: '1px solid #ddd',
            padding: '10px',
            overflowY: 'auto',
            marginBottom: '10px',
            background: '#f9f9f9'
          }
        },
          messages.length === 0 && React.createElement('p', {style: {color: '#999'}}, 'No messages'),
          messages.filter(m => !selected || (m.from === selected.id || m.to === selected.id))
            .map((m, i) =>
              React.createElement('div', {
                key: i,
                style: {
                  padding: '8px 12px',
                  marginBottom: '8px',
                  background: m.from === me?.id ? '#e3f2fd' : '#f5f5f5',
                  borderRadius: '4px',
                  wordBreak: 'break-word'
                }
              },
                React.createElement('strong', null, typeof m.from === 'object' ? (m.from.name || m.from.phone) : (m.from === me?.id ? me.name : selected?.name || selected?.phone)),
                React.createElement('p', {style: {margin: '5px 0 0 0'}}, m.text)
              )
            )
        ),
        React.createElement('div', {style: {display: 'flex', gap: '10px'}},
          React.createElement('input', {
            type: 'text',
            value: text,
            onChange: e => setText(e.target.value),
            onKeyDown: e => e.key === 'Enter' && send(),
            placeholder: 'Type a message...',
            style: {flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px'}
          }),
          React.createElement('button', {
            onClick: send,
            style: {padding: '8px 16px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px'}
          }, 'Send')
        )
      )
    )
  );
}

function Login({onSignup, onLogin, error}) {
  const [isSignup, setIsSignup] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pass, setPass] = useState('');

  return React.createElement('div', {
    style: {
      maxWidth: '400px',
      margin: '50px auto',
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontFamily: 'Arial'
    }
  },
    error && React.createElement('div', {style: {color: 'red', marginBottom: '10px', padding: '10px', background: '#ffe0e0', borderRadius: '4px'}}, error),
    React.createElement('h2', null, isSignup ? 'Sign Up' : 'Login'),
    isSignup && React.createElement('input', {
      type: 'text',
      placeholder: 'Full Name',
      value: name,
      onChange: e => setName(e.target.value),
      style: {width: '100%', padding: '8px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box'}
    }),
    React.createElement('input', {
      type: 'text',
      placeholder: 'Phone Number',
      value: phone,
      onChange: e => setPhone(e.target.value),
      style: {width: '100%', padding: '8px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box'}
    }),
    React.createElement('input', {
      type: 'password',
      placeholder: 'Password',
      value: pass,
      onChange: e => setPass(e.target.value),
      style: {width: '100%', padding: '8px', marginBottom: '20px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box'}
    }),
    React.createElement('button', {
      onClick: () => isSignup ? onSignup(name, phone, pass) : onLogin(phone, pass),
      style: {width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '10px'}
    }, isSignup ? 'Sign Up' : 'Login'),
    React.createElement('button', {
      onClick: () => {setIsSignup(!isSignup); setName(''); setPhone(''); setPass('');},
      style: {width: '100%', padding: '10px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer'}
    }, isSignup ? 'Already have an account? Login' : 'Need an account? Sign Up')
  );
}

const root = createRoot(document.getElementById('app'));
root.render(React.createElement(App));