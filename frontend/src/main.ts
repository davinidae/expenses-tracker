import "zone.js";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideHttpClient } from "@angular/common/http";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import Aura from "@primeuix/themes/aura";
import { providePrimeNG } from "primeng/config";
import { ConfirmationService, MessageService } from "primeng/api";
import { AppComponent } from "./app/app.component";

const savedTheme = localStorage.getItem("pocket-ledger-theme");
document.documentElement.classList.toggle("app-dark", savedTheme !== "light");

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: ".app-dark",
        },
      },
    }),
    ConfirmationService,
    MessageService,
  ],
}).catch((error) => {
  return console.error(error);
});
