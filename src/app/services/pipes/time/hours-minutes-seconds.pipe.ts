import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'hoursMinutesSeconds'
})
export class HoursMinutesSecondsPipe implements PipeTransform {

  transform(value: any, ...args: any[]): any {
    const totalMinutes = Math.floor(value / 60);
    const hours = Math.floor(totalMinutes / 60);
    const displayMinutes =  totalMinutes > 59 ? Math.floor(totalMinutes % 60 ) : totalMinutes;
    const seconds = Math.floor(value % 60);
    let zeroStringHours = '';
    if(hours < 10){
      zeroStringHours = '0'
    }

    let zeroStringMinutes = '';
    if(displayMinutes < 10){
      zeroStringMinutes = '0'
    }

    let zeroStringSeconds = '';
    if(seconds < 10){
      zeroStringSeconds = '0'
    }
    return zeroStringHours + hours + ':'+ zeroStringMinutes + displayMinutes + ':' + zeroStringSeconds + seconds;
  }

}
