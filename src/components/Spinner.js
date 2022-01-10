import React from 'react';
import Spinner from 'react-bootstrap/Spinner'

export function spinner({ type }) {
  if (type === 'table') {
    return (<tbody className="spinner-border text-light text-center"></tbody>)
  }
  else if (type === 'small') {
    return (<Spinner animation="border" variant="dark" size="sm" />)
  }
  else {
    return (<div className="spinner-border text-light text-center"></div>)
  }
}
export default spinner