import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CanvasComponent } from '../canvas/canvas.component';

const CATEGORY_ANIMATIONS: Record<string, string[]> = {
  vocabulario:  [],
  gramatica:    [],
  abecedario:   [],
  conversamos:  [],
};

const CATEGORY_LABELS: Record<string, string> = {
  vocabulario:  'Vocabulario',
  gramatica:    'Gramática',
  abecedario:   'Abecedario',
  conversamos:  '¿Conversamos?',
};

@Component({
  selector: 'app-modos',
  standalone: true,
  imports: [CommonModule, RouterModule, CanvasComponent],
  templateUrl: './modos.component.html',
  styleUrls: ['./modos.component.css'],
})
export class ModosComponent implements OnInit {

  currentAnimationUrls: string[] = [];
  hoveredCategory: string = '';

  constructor(private router: Router) {}

  ngOnInit(): void {}

  onHover(category: string): void {
    this.hoveredCategory = CATEGORY_LABELS[category] ?? '';
    this.currentAnimationUrls = CATEGORY_ANIMATIONS[category] ?? [];
  }

  onLeave(): void {
    this.hoveredCategory = '';
    this.currentAnimationUrls = [];
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}