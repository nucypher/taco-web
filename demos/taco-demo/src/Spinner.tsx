import type { CSSProperties } from 'react';
import React from 'react';
import ClipLoader from 'react-spinners/ClipLoader';

interface Props {
  loading: boolean;
}

export const Spinner = ({ loading }: Props) => {
  const style: CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
  };
  return (
    <div style={style}>
      <h2>Loading </h2>
      <ClipLoader color={'black'} loading={loading} />
    </div>
  );
};
