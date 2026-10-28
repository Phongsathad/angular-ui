import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'frontend';
}