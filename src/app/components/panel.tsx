import { useContext, useState } from 'react';
import bandsSet from '../data/bands.json';
import { Context, GlobalContext } from '../module/global';
import { dateString } from '../module/utils';
import { Select } from './input';

export default function Panel() {
  const {
    dateSliderValue,
    setDateSliderValue,
    allowGenerate,
    setAllowGenerate,
    red,
    setRed,
    green,
    setGreen,
    blue,
    setBlue,
  } = useContext(Context) as GlobalContext;

  const [dateTemp, setDateTemp] = useState(dateSliderValue);

  const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
  const currentDate = new Date();
  const currentDateMillis = currentDate.getTime();
  const dateStart = new Date(`${years.at(0)}-01-01`);
  const dateStartMillis = dateStart.getTime();

  const list = years
    .map((year, index1) =>
      ['01-01', '06-31'].map((date, index2) => (
        <option
          key={Number(`${index1 + 1}0${index2 + 1}`)}
          value={new Date(`${year}-${date}`).getTime()}
        />
      )),
    )
    .flat();

  const rangeWidth = 100;
  const yearLast = new Date(`${years.at(-1)}-01-01`).getTime();
  const timeDistance = ((yearLast - dateStartMillis) * 100) / (currentDateMillis - dateStartMillis);

  return (
    <div className='flexible vertical float-panel'>
      <div className='flexible gap'>
        <div className='flexible' style={{ width: '20%' }}>
          <input
            type='checkbox'
            checked={allowGenerate}
            onChange={(e) => setAllowGenerate(e.target.checked)}
          />
          Generate image
        </div>

        <div className='flexible gap wide' style={{ width: '30%' }}>
          <Select value={red} options={bandsSet} onChange={(value) => setRed(value)} />
          <Select value={green} options={bandsSet} onChange={(value) => setGreen(value)} />
          <Select value={blue} options={bandsSet} onChange={(value) => setBlue(value)} />
        </div>

        <div className='flexible center1 center2' style={{ backgroundColor: 'gray', width: '50%' }}>
          {dateString(new Date(dateSliderValue))}
        </div>
      </div>

      <input
        type='range'
        value={dateTemp}
        onChange={(e) => setDateTemp(Number(e.target.value))}
        onMouseUp={() => setDateSliderValue(dateTemp)}
        min={dateStartMillis}
        max={currentDateMillis}
        step={86_400_000}
        style={{
          width: `${rangeWidth}vh`,
          color: 'white',
        }}
        list='marker'
      />

      <datalist id='marker'>
        {years
          .map((year, index1) =>
            ['01-01', '06-31'].map((date, index2) => (
              <option
                key={Number(`${index1 + 1}0${index2 + 1}`)}
                value={new Date(`${year}-${date}`).getTime()}
              />
            )),
          )
          .flat()}
      </datalist>

      <div className='flexible wide' style={{ width: `${timeDistance}vh` }}>
        {years.map((year, index) => (
          <div className='flexible' key={index}>
            {year}
          </div>
        ))}
      </div>
    </div>
  );
}
