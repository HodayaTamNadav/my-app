import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Graf from "./graph";
import moment from 'moment';
import 'bootstrap/dist/css/bootstrap.min.css';
import './home.css'

function Home() {

    const localStorageList = localStorage.getItem('bankData') ? JSON.parse(localStorage.getItem('bankData')) : undefined;
    const [bankData, setBankData] = useState([])
    const [keyData, setKeyData] = useState([])
    const [dateList, setDateList] = useState([])
    const [timePart, setTimePart] = useState('')
    const [currency, setCurrency] = useState('')
    const isEffect = useRef(false);


    useEffect(() => {
        const func = async () => {
            if (localStorageList == undefined) {
                isEffect.current = true;
                const response = await fetch('/api/boi/PublicApi/GetExchangeRates');
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const json = await response.json();
                localStorage.setItem('bankData', JSON.stringify(json.exchangeRates))
                setBankData(json.exchangeRates)
            }
            else {
                setBankData(localStorageList)
            }
            setCurrency('USD')
        }
        if (isEffect.current == false)
            func()
    }, [])

    useEffect(() => {
        if (bankData !== undefined) {
            const data = bankData?.filter((item) => item.key == currency)
            setKeyData(data)
            if (timePart)
                changeTimePart(timePart)
        }
    }, [currency])

    const addDays = (date, days) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
    const fillMissingDays = (uniqueData) => {
        const availableDates = uniqueData.map(item => item.TIME_PERIOD);
        const minDate = new Date(Math.min(...availableDates.map(date => new Date(date).getTime())));
        const maxDate = new Date(Math.max(...availableDates.map(date => new Date(date).getTime())));
        const fullDateRange = [];
        let currentDate = new Date(minDate);

        while (currentDate <= maxDate) {
            fullDateRange.push(currentDate.toISOString().split('T')[0]);
            currentDate = addDays(currentDate, 1);
        }

        const missingDates = fullDateRange.filter(date => !availableDates.includes(date));
        missingDates.forEach(missingDate => {
            const lastAvailableData = uniqueData
                .filter(item => new Date(item.TIME_PERIOD) < new Date(missingDate))
                .sort((a, b) => new Date(b.TIME_PERIOD) - new Date(a.TIME_PERIOD))[0];

            const newData = { ...lastAvailableData, TIME_PERIOD: missingDate };
            uniqueData.push(newData);
        });

        uniqueData.sort((a, b) => new Date(a.TIME_PERIOD) - new Date(b.TIME_PERIOD));
        return uniqueData
    }
    const getStartDate = (timePart, date) => {
        const FORMAT = 'YYYY-MM-DD';
        let startDate;
        if (timePart == 'week') {
            date.setDate(date.getDate() - 7);
            const formattedDate = date.toISOString().slice(0, 10);
            startDate = formattedDate;
        }
        else if (timePart == 'month') {
            startDate = moment(date.setMonth(date.getMonth() - 1, date.getDate() - 1)).format(FORMAT);
        }
        else if (timePart == '6-month') {
            startDate = moment(date.setMonth(date.getMonth() - 6)).format(FORMAT);
        }
        else if (timePart == 'year') {
            startDate = moment(date.setMonth(date.getMonth() - 12)).format(FORMAT);
        }
        return startDate
    }
    const changeTimePart = async (timePart) => {
        setTimePart(timePart)
        const datetime = keyData[0]?.lastUpdate;
        let startDate;
        const finallDate = datetime.split('T')[0];
        const date = new Date(datetime);

        startDate = getStartDate(timePart, date)


        const url = `api/edge/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/EXR/1.0?startperiod=${startDate}&endperiod=${finallDate}&format=csv`

        await fetch(url)
            .then(response => {
                if (response.ok) {
                    return response.text();
                } else {
                    throw new Error('Request failed with status ' + response.status);
                }
            })
            .then(csvData => {
                const rows = csvData.split('\n');
                const headers = rows[0].split(',');
                const data = rows.slice(1).map(row => {
                    const values = row.split(',');
                    const rowData = {};
                    headers.forEach((header, index) => {
                        rowData[header] = values[index];
                    });
                    return rowData;
                });

                const seen = new Set();
                let uniqueData = data.filter(row => {
                    if (seen.has(row.TIME_PERIOD) ||
                        row.BASE_CURRENCY !== currency ||
                        (row.BASE_CURRENCY === 'USD' && row.SERIES_CODE !== "RER_USD_ILS")) {
                        return false
                    } else {
                        seen.add(row.TIME_PERIOD);
                        return true;
                    }
                });


                uniqueData = fillMissingDays(uniqueData)

                let dateList = []
                uniqueData.map((item) => {
                    const date = item.TIME_PERIOD.split('-')[2] + '-' + item.TIME_PERIOD.split('-')[1]
                    dateList.push({ label: date, y: Number(item.OBS_VALUE) })
                })
                if (timePart == '6-month' || timePart == 'year') {
                    let day = date.getDate()
                    let relevantArr = dateList?.filter(x => Number(x.label.split('-')[0]) === day)
                    setDateList(relevantArr)
                }
                else
                    setDateList(dateList)


            })
            .catch(error => {
                console.error('Error fetching CSV data:', error);
            });
    }

    return (
        <div>
            <div className="center">
                <select onChange={(e) => setCurrency(e.target.value)}>
                    <option style={{ backgroundColor: currency == 'USD' ? "blue" : "white" }} value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="SEK">SEK</option>
                    <option value="CHF">CHF</option>
                </select>
                <button className="btn btn-outline-secondary" type="button" onClick={() => changeTimePart('week')}>שבוע</button>
                <button className="btn btn-outline-secondary" type="button" onClick={() => changeTimePart('month')}>חודש</button>
                <button className="btn btn-outline-secondary" type="button" onClick={() => changeTimePart('6-month')}>חצי שנה</button>
                <button className="btn btn-outline-secondary" type="button" onClick={() => changeTimePart('year')}>שנה</button>
            </div>
            <br />
            <Graf bankData={bankData} currency={currency} dateList={dateList}></Graf>
        </div>
    )


}

export default Home;