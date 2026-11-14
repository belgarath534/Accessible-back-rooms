require 'json'
package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
Pod::Spec.new do |s|
  s.name = 'LeoGameCenter'
  s.version = package['version']
  s.summary = package['description']
  s.license = 'MIT'
  s.homepage = 'https://github.com/belgarath534/Accessible-back-rooms'
  s.author = 'Leo Productions'
  s.source = { :git => 'https://github.com/belgarath534/Accessible-back-rooms.git', :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.swift'
  s.ios.deployment_target = '14.0'
  s.dependency 'Capacitor'
  s.frameworks = 'GameKit'
  s.swift_version = '5.1'
end
