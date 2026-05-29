import React, { createContext, useState } from 'react';

export const QueueContext = createContext();

export const QueueProvider = ({ children }) => {
  const [queue, setQueue] = useState([]);

  const addItem = (item) => {
    setQueue((prevQueue) => [...prevQueue, item]);
  };

  const clearQueue = () => {
    setQueue([]);
  };

  return (
    <QueueContext.Provider value={{ queue, addItem, clearQueue }}>
      {children}
    </QueueContext.Provider>
  );
};
