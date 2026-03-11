import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';

@Component({
  selector: 'app-learning-object',
  templateUrl: './learning-object.component.html',
  styleUrls: ['./learning-object.component.css']
})
export class LearningObjectComponent {
  contentUrl: SafeResourceUrl;

  constructor(
    private sanitizer: DomSanitizer,
    private router: Router
  ) {
    this.contentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'assets/learning/visualvoices/index.html'
    );
  }

  close() {
    this.router.navigate(['/modos2']);
  }
}