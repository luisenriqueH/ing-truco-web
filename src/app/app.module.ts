import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { GameService } from './services/game.service';

@NgModule({
  declarations: [
    // Components would go here
  ],
  imports: [
    BrowserModule
  ],
  providers: [GameService],
  bootstrap: []
})
export class AppModule { }
