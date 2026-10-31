#!/usr/bin/perl
# Tiny local web server for previewing the app on this Mac — no installs needed.
#   perl dev/serve.pl          then open http://localhost:8765
# Run it from the app folder. Stop with Ctrl+C.
use strict;
use warnings;
use IO::Socket::INET;
use File::Basename qw(dirname);
use Cwd qw(abs_path);

my $port = $ARGV[0] || 8765;
my $root = abs_path(dirname(abs_path($0)) . '/..');
my %types = (
  html => 'text/html; charset=utf-8', css => 'text/css; charset=utf-8',
  js => 'text/javascript; charset=utf-8', json => 'application/json; charset=utf-8',
  webmanifest => 'application/manifest+json', svg => 'image/svg+xml',
  png => 'image/png', jpg => 'image/jpeg', jpeg => 'image/jpeg', webp => 'image/webp', gif => 'image/gif',
);

my $server = IO::Socket::INET->new(LocalAddr => '127.0.0.1', LocalPort => $port, Listen => 20, ReuseAddr => 1)
  or die "Can't listen on port $port: $!\n";
$SIG{CHLD} = 'IGNORE';
print "Serving $root at http://localhost:$port\n";

while (my $c = $server->accept) {
  next if fork;  # child handles the request
  my $line = <$c> // '';
  while (my $h = <$c>) { last if $h =~ /^\r?\n$/ }
  my ($method, $path) = $line =~ m{^(\w+)\s+(\S+)};
  $path //= '/';
  $path =~ s/[?#].*//;
  $path =~ s/%([0-9A-Fa-f]{2})/chr(hex($1))/ge;
  $path .= 'index.html' if $path =~ m{/$};
  my $file = "$root$path";
  if ($path =~ /\.\./ || !-f $file) {
    print $c "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nContent-Length: 9\r\nConnection: close\r\n\r\nNot found";
  } else {
    my ($ext) = $file =~ /\.(\w+)$/;
    open my $fh, '<:raw', $file; local $/; my $body = <$fh>; close $fh;
    printf $c "HTTP/1.1 200 OK\r\nContent-Type: %s\r\nContent-Length: %d\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n",
      $types{lc($ext // '')} || 'application/octet-stream', length $body;
    print $c $body unless ($method // '') eq 'HEAD';
  }
  close $c;
  exit 0;
}
