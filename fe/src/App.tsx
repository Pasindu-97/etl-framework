import { Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import InputPage from './components/InputPage';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/input" element={<InputPage />} />
      </Routes>
    </div>
  );
};

export default App;