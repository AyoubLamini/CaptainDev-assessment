import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EMAIL_ADAPTER_TOKEN } from './adapters/email.adapter.interface';
import { ResendAdapter } from './adapters/resend.adapter';
import { RecordingAdapter } from './adapters/recording.adapter';

@Module({
  providers: [
    EmailService,
    {
      provide: EMAIL_ADAPTER_TOKEN,
      useClass: process.env.NODE_ENV === 'test' ? RecordingAdapter : ResendAdapter,
    },
  ],
  exports: [EmailService, EMAIL_ADAPTER_TOKEN],
})
export class EmailModule {}
