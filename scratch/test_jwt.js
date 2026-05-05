const url = "https://painel3.firegamesnetwork.com:8080/download/file?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImp0aSI6ImQxMmY1OGU3YmFkMTFlMTBiNDY1MmIyNDY3Zjc3YmI2In0.eyJpc3MiOiJodHRwczovL3BhaW5lbDMuZmlyZWdhbWVzbmV0d29yay5jb20iLCJhdWQiOlsiaHR0cHM6Ly9wYWluZWwzLmZpcmVnYW1lc25ldHdvcmsuY29tOjgwODAiXSwianRpIjoiZDEyZjU4ZTdiYWQxMWUxMGI0NjUyYjI0NjdmNzdiYjYiLCJpYXQiOjE3NzgwMTM0NTMsIm5iZiI6MTc3ODAxMzE1MywiZXhwIjoxNzc4MDE0MzUzLCJmaWxlX3BhdGgiOiJnYW1lL2NzZ28vTWF0Y2haeS8yMDI2LTA1LTA1XzAyLTQ2LTQzXzk0X2RlX2FuY2llbnRfdGVhbV9KYW1hbHplcmFBQV92c190ZWFtX01vbGVOYW9Eb3kuZGVtIiwic2VydmVyX3V1aWQiOiIwOTgyMWExOS0zNDExLTRiMzUtOWFmNS0yYWNhMDZhMDQ5MGEiLCJ1c2VyX3V1aWQiOiIxOGE5MWM2MS04Yjg1LTQ3NDUtYmQ0ZS04OTAzNGFhYmI3YzUiLCJ1c2VyX2lkIjo3NSwidW5pcXVlX2lkIjoiTkFLU1lteGg0MFR5WVA3TyJ9.0jX0zNJ7dxitQQO9cnYvn6Wv4IQxeq-FfSI19-xPe-Y";

let resolvedMapName = 'Desconhecido';
try {
    const tokenMatch = url.match(/token=([^&]+)/);
    if (tokenMatch) {
        const token = tokenMatch[1];
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
            const payload = Buffer.from(payloadBase64, 'base64').toString('utf-8');
            console.log('Payload:', payload);
            const mapMatch = payload.match(/_(de_[a-z0-9_]+|cs_[a-z0-9_]+)_team/i);
            if (mapMatch) resolvedMapName = mapMatch[1];
        }
    }
} catch(e) {}
console.log('Resolved Map Name:', resolvedMapName);
