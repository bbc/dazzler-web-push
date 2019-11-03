self.addEventListener('push', function (event) {
  const payload = event.data ? event.data.text() : 'no payload';
  Client.postMessage(payload);
  event.waitUntil(
    self.registration.showNotification('Dazzler', {
      body: 'new or updated clip or episode',
    })
  );
});
