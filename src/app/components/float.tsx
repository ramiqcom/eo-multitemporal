import { useContext } from 'react';
import { Context, GlobalContext } from '../module/global';
import Panel from './panel';

export default function Float() {
  const { loadingText } = useContext(Context) as GlobalContext;

  return (
    <div id='float' className='flexible vertical small-gap'>
      {loadingText ? <div className='float-panel'>{loadingText}</div> : undefined}
      <Panel />
    </div>
  );
}
