import { Module, Global } from '@nestjs/common';
import { EventConsumerService } from './event-consumer.service';
import { EventProducerService } from './event-producer.service';

@Global()
@Module({
  providers: [EventConsumerService, EventProducerService],
  exports: [EventProducerService],
})
export class EventsModule {}
